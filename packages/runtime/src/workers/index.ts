import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { PrismaClient } from '@fricta/db';
import { QueueOrchestrator, AGENT_TASK_QUEUE_NAME, ORCHESTRATION_QUEUE_NAME, CORRELATION_QUEUE_NAME } from '../queues';
import { SessionLockManager } from '../locks';
import { DistributedTelemetryService } from '../telemetry';
import { RuntimeCoordinator } from '../execution';
import { WorkerAssignmentMetadata } from '../types';
import { logger } from '@fricta/shared';
import { SharedContext } from '@fricta/orchestrator/dist/memory';
import { MessageBroker } from '@fricta/orchestrator/dist/communication';
import { TimelineRecorder } from '@fricta/orchestrator/dist/timeline';
import { SharedMemoryCorrelationEngine, SharedMemorySynthesisEngine } from '@fricta/shared-memory';

export class RuntimeWorkerPool {
  private workers: Worker[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(
    private workerId: string,
    private prisma: PrismaClient,
    private queueOrchestrator: QueueOrchestrator,
    private lockManager: SessionLockManager,
    private telemetryService: DistributedTelemetryService
  ) {}

  async start(): Promise<void> {
    logger.info({ workerId: this.workerId }, 'Starting Fricta Distributed Runtime Worker Pool');

    const connection = this.queueOrchestrator.getConnection();

    // 1. Orchestration Queue Worker
    const orchestrationWorker = new Worker(
      ORCHESTRATION_QUEUE_NAME,
      async (job: Job) => {
        const { workflowSessionId } = job.data;
        logger.info({ jobId: job.id, workflowSessionId }, 'Orchestration worker processing job');

        const coordinator = new RuntimeCoordinator(
          this.prisma,
          this.queueOrchestrator,
          this.lockManager,
          this.telemetryService,
          this.workerId
        );

        await coordinator.executeSession(workflowSessionId);
      },
      { connection, concurrency: 2 }
    );

    // 2. Agent Task Queue Worker
    const agentTaskWorker = new Worker(
      AGENT_TASK_QUEUE_NAME,
      async (job: Job) => {
        const { orchestrationSessionId, workflowSessionId, taskId, agentType, task } = job.data;
        logger.info({ taskId, agentType }, 'Agent task worker executing task');

        // Check/acquire task lock
        const ownerId = `${this.workerId}:${job.id}`;
        const lockKey = `task:${taskId}`;
        const acquired = await this.lockManager.acquire(lockKey, 'execution', ownerId, 45000);
        if (!acquired) {
          throw new Error(`Task lock for ${taskId} already held`);
        }

        // Set worker assignment metadata
        const workerAssignment: WorkerAssignmentMetadata = {
          version: 1,
          workerId: this.workerId,
          agentType,
          assignedAt: new Date().toISOString(),
          heartbeatAt: new Date().toISOString(),
        };

        await this.prisma.agentExecution.update({
          where: { id: taskId },
          data: {
            status: 'RUNNING',
            startedAt: new Date(),
            metadata: workerAssignment as any,
          },
        });

        // Initialize communications
        const context = new SharedContext(this.prisma, orchestrationSessionId);
        const broker = new MessageBroker(this.prisma, orchestrationSessionId);
        const timeline = new TimelineRecorder(this.prisma, orchestrationSessionId);

        try {
          // Import/Create appropriate Agent Wrapper
          const orchestratorPkg = require('@fricta/orchestrator');
          let agent;

          switch (agentType) {
            case 'VISUAL_AUDITOR':
              agent = new orchestratorPkg.VisualAuditorAgent(this.prisma, workflowSessionId, context, broker, timeline);
              break;
            case 'COGNITIVE_SIMULATOR':
              agent = new orchestratorPkg.CognitiveSimulatorAgent(this.prisma, workflowSessionId, context, broker, timeline);
              break;
            case 'UX_ORCHESTRATOR':
              agent = new orchestratorPkg.UXOrchestratorAgent(this.prisma, workflowSessionId, context, broker, timeline);
              break;
            case 'NAVIGATION_AGENT':
              agent = new orchestratorPkg.NavigationAgentWrapper(this.prisma, workflowSessionId, context, broker, timeline);
              break;
            case 'ONBOARDING_AGENT':
              agent = new orchestratorPkg.OnboardingAgentWrapper(this.prisma, workflowSessionId, context, broker, timeline);
              break;
            case 'DISCOVERABILITY_AGENT':
              agent = new orchestratorPkg.DiscoverabilityAgentWrapper(this.prisma, workflowSessionId, context, broker, timeline);
              break;
            case 'COGNITIVE_AGENT':
              agent = new orchestratorPkg.CognitiveAgentWrapper(this.prisma, workflowSessionId, context, broker, timeline);
              break;
            case 'VISUAL_AGENT':
              agent = new orchestratorPkg.VisualAgentWrapper(this.prisma, workflowSessionId, context, broker, timeline);
              break;
            case 'WORKFLOW_AGENT':
              agent = new orchestratorPkg.WorkflowAgentWrapper(this.prisma, workflowSessionId, context, broker, timeline);
              break;
            default:
              throw new Error(`Unsupported agent type: ${agentType}`);
          }

          const orchestrationTask = {
            id: taskId,
            agentType,
            description: task,
            priority: 'MEDIUM' as const,
            dependencies: [],
            status: 'RUNNING' as const,
            retryCount: 0,
          };

          // Execute specialist agent
          const result = await agent.execute(orchestrationTask);

          // Update execution with result
          await this.prisma.agentExecution.update({
            where: { id: taskId },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
              result: result || {},
            },
          });

          // Persist agent output details
          if (result && (result.findings || result.signals || result.reasoningTraces)) {
            await this.persistAgentExecutionOutput(taskId, agentType, result);
          }

        } catch (err: any) {
          logger.error({ err: err.message, taskId }, 'Error executing agent task in worker');
          await this.prisma.agentExecution.update({
            where: { id: taskId },
            data: {
              status: 'FAILED',
              completedAt: new Date(),
              metadata: {
                ...workerAssignment,
                lastError: err.message,
              } as any,
            },
          });
          throw err;
        } finally {
          await this.lockManager.release(lockKey, 'execution', ownerId);
        }
      },
      { connection, concurrency: parseInt(process.env.AGENT_WORKER_CONCURRENCY || '3', 10) }
    );

    // 3. Correlation Queue Worker
    const correlationWorker = new Worker(
      CORRELATION_QUEUE_NAME,
      async (job: Job) => {
        const { orchestrationSessionId } = job.data;
        logger.info({ orchestrationSessionId }, 'Running correlation and synthesis engines');

        // Run correlation
        const correlationEngine = new SharedMemoryCorrelationEngine(this.prisma, orchestrationSessionId);
        await correlationEngine.runCorrelation();

        // Run synthesis
        const synthesisEngine = new SharedMemorySynthesisEngine(this.prisma, orchestrationSessionId);
        await synthesisEngine.runSynthesis();
      },
      { connection, concurrency: 1 }
    );

    this.workers.push(orchestrationWorker, agentTaskWorker, correlationWorker);

    // Start sending heartbeat signals
    this.startHeartbeatLoop();
  }

  private startHeartbeatLoop() {
    this.heartbeatInterval = setInterval(async () => {
      try {
        const cpuUsage = process.cpuUsage();
        const mem = process.memoryUsage();
        // Convert to percentage and MB
        const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000;
        const memMb = Math.round(mem.rss / (1024 * 1024));

        await this.telemetryService.reportWorkerHeartbeat(
          this.workerId,
          0, // active jobs count can be computed if needed
          parseFloat(cpuPercent.toFixed(2)),
          memMb
        );
      } catch (err) {
        logger.error({ err }, 'Error sending worker heartbeat');
      }
    }, 5000);
  }

  private async persistAgentExecutionOutput(agentExecutionId: string, agentType: string, result: any): Promise<void> {
    const { findings, signals, reasoningTraces } = result;

    await this.prisma.$transaction(async (tx) => {
      // Clean old records
      await tx.agentFinding.deleteMany({ where: { agentExecutionId } });
      await tx.agentSignal.deleteMany({ where: { agentExecutionId } });
      await tx.agentReasoningTrace.deleteMany({ where: { agentExecutionId } });

      if (Array.isArray(findings) && findings.length > 0) {
        await tx.agentFinding.createMany({
          data: findings.map((f: any) => ({
            agentExecutionId,
            agentType,
            findingType: f.findingType,
            severity: f.severity,
            title: f.title,
            description: f.description,
            evidence: f.evidence || '',
            correlatedFindings: f.correlatedFindings ? f.correlatedFindings : undefined
          }))
        });
      }

      if (Array.isArray(signals) && signals.length > 0) {
        await tx.agentSignal.createMany({
          data: signals.map((s: any) => ({
            agentExecutionId,
            signalType: s.signalType,
            intensity: s.intensity,
            metadata: s.metadata ? s.metadata : undefined
          }))
        });
      }

      if (Array.isArray(reasoningTraces) && reasoningTraces.length > 0) {
        await tx.agentReasoningTrace.createMany({
          data: reasoningTraces.map((r: any) => ({
            agentExecutionId,
            stepType: r.stepType,
            summary: r.summary,
            evidence: r.evidence || null
          }))
        });
      }
    });
  }

  async stop(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    for (const w of this.workers) {
      await w.close();
    }
    this.workers = [];
  }
}
