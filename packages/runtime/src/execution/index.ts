import { PrismaClient } from '@fricta/db';
import { OrchestratorCoordinator } from '@fricta/orchestrator';
import { QueueOrchestrator } from '../queues';
import { SessionLockManager } from '../locks';
import { DistributedTelemetryService } from '../telemetry';
import { RuntimeOwnershipMetadata, DistributedExecutionMetadata } from '../types';
import { RealtimeEventBus } from '@fricta/realtime';
import { logger } from '@fricta/shared';
import * as os from 'os';

export class RuntimeCoordinator {
  private prisma: PrismaClient;
  private queueOrchestrator: QueueOrchestrator;
  private lockManager: SessionLockManager;
  private telemetryService: DistributedTelemetryService;
  private workerId: string;

  constructor(
    prisma: PrismaClient,
    queueOrchestrator: QueueOrchestrator,
    lockManager: SessionLockManager,
    telemetryService: DistributedTelemetryService,
    workerId: string
  ) {
    this.prisma = prisma;
    this.queueOrchestrator = queueOrchestrator;
    this.lockManager = lockManager;
    this.telemetryService = telemetryService;
    this.workerId = workerId;
  }

  /**
   * Orchestrates a workflow session investigation. Toggles between local and distributed worker modes.
   */
  async executeSession(workflowSessionId: string): Promise<string> {
    const isDistributed = process.env.DISTRIBUTED_EXECUTION === 'true';
    logger.info({ workflowSessionId, isDistributed }, 'RuntimeCoordinator starting session execution');

    // 1. Acquire session execution lock
    const lockAcquired = await this.lockManager.acquire(
      workflowSessionId,
      'execution',
      this.workerId,
      120000 // 2 minutes initial TTL
    );

    if (!lockAcquired) {
      logger.warn({ workflowSessionId }, 'Failed to acquire execution lock, session already running or locked');
      throw new Error(`Execution lock for session ${workflowSessionId} is held by another worker`);
    }

    // Lock renewal interval
    const lockRenewInterval = setInterval(async () => {
      try {
        await this.lockManager.acquire(workflowSessionId, 'execution', this.workerId, 120000);
      } catch (err) {
        logger.error({ err }, 'Failed to renew session lock');
      }
    }, 60000);

    try {
      if (!isDistributed) {
        // Local Mode: Fallback to the existing local OrchestratorCoordinator
        logger.info({ workflowSessionId }, 'Executing session in LOCAL mode');
        const coordinator = new OrchestratorCoordinator(this.prisma);
        const orchestrationSessionId = await coordinator.runOrchestration(workflowSessionId);
        
        // Trigger historical learning pipeline
        await this.triggerHistoricalPipeline(workflowSessionId, orchestrationSessionId);
        
        return orchestrationSessionId;
      }

      // Distributed Mode: Run queue-driven orchestration
      logger.info({ workflowSessionId }, 'Executing session in DISTRIBUTED mode');
      const manager = new SessionExecutionManager(
        this.prisma,
        this.queueOrchestrator,
        this.lockManager,
        this.telemetryService,
        this.workerId
      );
      const orchestrationSessionId = await manager.runDistributedOrchestration(workflowSessionId);
      
      // Trigger historical learning pipeline
      await this.triggerHistoricalPipeline(workflowSessionId, orchestrationSessionId);
      
      return orchestrationSessionId;
    } finally {
      clearInterval(lockRenewInterval);
      await this.lockManager.release(workflowSessionId, 'execution', this.workerId);
    }
  }

  private async triggerHistoricalPipeline(workflowSessionId: string, orchestrationSessionId: string) {
    try {
      const workflowSession = await this.prisma.workflowSession.findUnique({
        where: { id: workflowSessionId }
      });
      if (!workflowSession) return;

      const projectId = workflowSession.projectId;
      logger.info({ projectId, workflowSessionId, orchestrationSessionId }, 'Orchestration finished, triggering HistoricalIntelligencePipeline');
      
      const { HistoricalIntelligencePipeline } = require('@fricta/historical-intelligence');
      const pipeline = new HistoricalIntelligencePipeline(this.prisma);
      await pipeline.runPipeline(projectId, workflowSessionId);
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to trigger historical learning pipeline');
    }
  }
}

export class SessionExecutionManager {
  constructor(
    private prisma: PrismaClient,
    private queueOrchestrator: QueueOrchestrator,
    private lockManager: SessionLockManager,
    private telemetryService: DistributedTelemetryService,
    private workerId: string
  ) {}

  async runDistributedOrchestration(workflowSessionId: string): Promise<string> {
    // 1. Create Orchestration Session
    const ownership: RuntimeOwnershipMetadata = {
      version: 1,
      workerId: this.workerId,
      hostName: os.hostname(),
      pid: process.pid,
      acquiredAt: new Date().toISOString()
    };

    const orchestrationSession = await this.prisma.orchestrationSession.create({
      data: {
        workflowSessionId,
        status: 'RUNNING',
        startedAt: new Date(),
        metadata: { ownership } as any
      }
    });

    const sessionId = orchestrationSession.id;

    // Load goals
    const workflowSession = await this.prisma.workflowSession.findUnique({
      where: { id: workflowSessionId }
    });
    const goal = workflowSession?.goal || 'General Usability Diagnostics';

    // Publish start event
    RealtimeEventBus.getInstance().publish({
      timestamp: new Date().toISOString(),
      orchestrationSessionId: sessionId,
      eventType: 'orchestration.started',
      payload: {
        workflowSessionId,
        goal,
        startedAt: new Date().toISOString()
      }
    });

    // Mock sequence tasks (reproducing original route Investigation logic)
    const { DelegationEngine } = require('@fricta/orchestrator');
    const delegation = new DelegationEngine();
    const tasks = delegation.routeInvestigation(goal);

    // Fetch active adaptive profiles for the project
    const projectId = workflowSession?.projectId || '';
    const adaptiveProfiles = await this.prisma.adaptiveSignalProfile.findMany({
      where: { projectId, isActive: true }
    });

    // Create DB records for execution & dependencies
    for (const task of tasks) {
      const profile = adaptiveProfiles.find(p => p.agentType === task.agentType);
      let priority = task.priority;
      let metadataOverrides = {};

      if (profile) {
        priority = profile.targetPriority;
        metadataOverrides = {
          adapted: true,
          reasonTrigger: profile.reasonTrigger,
          overrides: (profile.metadata as any)?.overrides || {}
        };
        logger.info(
          { agentType: task.agentType, originalPriority: task.priority, adaptedPriority: priority },
          'Orchestrator applying adaptive prioritization overrides'
        );
      }

      const execMeta: DistributedExecutionMetadata = {
        version: 1,
        queueName: 'agent-task-queue',
        jobId: '',
        retryCount: 0,
        ...metadataOverrides
      };

      await this.prisma.agentExecution.create({
        data: {
          id: task.id,
          orchestrationSessionId: sessionId,
          agentType: task.agentType,
          status: 'QUEUED',
          task: task.description,
          startedAt: null,
          completedAt: null,
          metadata: execMeta as any
        }
      });
    }

    // Publish timeline event
    await this.prisma.sharedContextEvent.create({
      data: {
        orchestrationSessionId: sessionId,
        eventType: 'TASK_SEQUENCE_INITIALIZED',
        payload: { taskCount: tasks.length }
      }
    });

    // Run dependency execution loop
    const completedTaskIds = new Set<string>();
    const failedTaskIds = new Set<string>();

    let pendingTasks = [...tasks];

    while (pendingTasks.length > 0) {
      // Find executable tasks (whose dependencies are all completed)
      const executable = pendingTasks.filter(t => 
        t.dependencies.every((depId: string) => completedTaskIds.has(depId))
      );

      if (executable.length === 0 && pendingTasks.length > 0) {
        // Deadlock or dependency issue, stop execution
        logger.error({ pendingTasks }, 'Dependency deadlock detected in task sequence. Failing orchestration.');
        throw new Error('Dependency deadlock detected');
      }

      // Execute current batch in parallel
      await Promise.all(
        executable.map(async (task) => {
          // Remove from pending
          pendingTasks = pendingTasks.filter(pt => pt.id !== task.id);

          try {
            await this.prisma.agentExecution.update({
              where: { id: task.id },
              data: { status: 'RUNNING', startedAt: new Date() }
            });

            // Enqueue Agent Task to Queue with adaptive priority
            const profile = adaptiveProfiles.find(p => p.agentType === task.agentType);
            const finalPriority = profile ? profile.targetPriority : task.priority;

            const job = await this.queueOrchestrator.enqueueAgentTask(
              sessionId,
              workflowSessionId,
              task.id,
              task.agentType,
              task.description,
              finalPriority === 'CRITICAL' ? 1 : finalPriority === 'HIGH' ? 3 : 5
            );

            // Update metadata with BullMQ jobId
            await this.prisma.agentExecution.update({
              where: { id: task.id },
              data: {
                metadata: {
                  version: 1,
                  queueName: 'agent-task-queue',
                  jobId: job.id,
                  retryCount: 0
                } as any
              }
            });

            // Poll for task completion in DB (wait up to 60 seconds)
            const timeoutMs = 60000;
            const start = Date.now();
            let dbTask = null;

            while (Date.now() - start < timeoutMs) {
              dbTask = await this.prisma.agentExecution.findUnique({
                where: { id: task.id }
              });

              if (dbTask && (dbTask.status === 'COMPLETED' || dbTask.status === 'FAILED' || dbTask.status === 'CANCELLED')) {
                break;
              }
              await new Promise(r => setTimeout(r, 1000));
            }

            if (!dbTask || dbTask.status === 'RUNNING' || dbTask.status === 'QUEUED') {
              // Task timeout recovery
              logger.warn({ taskId: task.id }, 'Agent execution timed out. Triggering recovery...');
              await this.telemetryService.incrementRecoveryCount(sessionId);
              throw new Error('Agent execution timeout');
            }

            if (dbTask.status === 'COMPLETED') {
              completedTaskIds.add(task.id);
            } else {
              failedTaskIds.add(task.id);
              logger.error({ taskId: task.id }, 'Agent task failed in worker execution');
            }
          } catch (err: any) {
            failedTaskIds.add(task.id);
            logger.error({ taskId: task.id, err: err.message }, 'Failed to execute distributed agent task');
            await this.prisma.agentExecution.update({
              where: { id: task.id },
              data: { status: 'FAILED', completedAt: new Date() }
            });
          }
        })
      );
    }

    // Execution complete: process final calculations
    const finalStatus = failedTaskIds.size > 0 ? 'FAILED' : 'COMPLETED';

    // Run correlation queue run in background
    await this.queueOrchestrator.enqueueCorrelation(sessionId);

    // Save final state
    await this.prisma.orchestrationSession.update({
      where: { id: sessionId },
      data: {
        status: finalStatus,
        completedAt: new Date(),
        metadata: {
          ownership,
          tasksCompleted: Array.from(completedTaskIds),
          tasksFailed: Array.from(failedTaskIds)
        } as any
      }
    });

    RealtimeEventBus.getInstance().publish({
      timestamp: new Date().toISOString(),
      orchestrationSessionId: sessionId,
      eventType: 'orchestration.completed',
      payload: {
        status: finalStatus,
        completedAt: new Date().toISOString(),
        metadata: {
          tasksCompleted: Array.from(completedTaskIds),
          tasksFailed: Array.from(failedTaskIds)
        }
      }
    });

    return sessionId;
  }
}
