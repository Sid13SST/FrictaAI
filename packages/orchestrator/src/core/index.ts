import { PrismaClient } from '@fricta/db';
import { SharedContext } from '../memory';
import { MessageBroker } from '../communication';
import { TimelineRecorder } from '../timeline';
import { RecoveryManager } from '../recovery';
import { DelegationEngine } from '../delegation';
import { TaskScheduler } from '../scheduler';
import { BaseOrchestratedAgent, VisualAuditorAgent, CognitiveSimulatorAgent, UXOrchestratorAgent } from '../agents';
import { OrchestrationTask, AgentType } from '../types';

export class OrchestratorCoordinator {
  public static activeWorkflowSessions = new Set<string>();

  private context!: SharedContext;
  private broker!: MessageBroker;
  private timeline!: TimelineRecorder;
  private recovery!: RecoveryManager;
  private delegation!: DelegationEngine;
  private scheduler!: TaskScheduler;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Spawns specialized agents, executes tasks, tracks life cycles, and synchronizes context events.
   */
  async runOrchestration(workflowSessionId: string): Promise<string> {
    console.log(`[OrchestratorCoordinator] Starting multi-agent investigation for Session: ${workflowSessionId}`);

    OrchestratorCoordinator.activeWorkflowSessions.add(workflowSessionId);

    let sessionId: string | null = null;
    try {
      // 1. Create Orchestration Session
      const orchestrationSession = await this.prisma.orchestrationSession.create({
        data: {
          workflowSessionId,
          status: 'RUNNING',
          startedAt: new Date(),
          metadata: {}
        }
      });

      sessionId = orchestrationSession.id;

      // 2. Initialize layers
      this.context = new SharedContext(this.prisma, sessionId);
      this.broker = new MessageBroker(this.prisma, sessionId);
      this.timeline = new TimelineRecorder(this.prisma, sessionId);
      this.recovery = new RecoveryManager(this.timeline);
      this.delegation = new DelegationEngine();
      this.scheduler = new TaskScheduler();

      // 3. Load Workflow Session parameters
      const workflowSession = await this.prisma.workflowSession.findUnique({
        where: { id: workflowSessionId }
      });
      const goal = workflowSession?.goal || 'General Usability Diagnostics';

      await this.timeline.logEvent('AGENT_SPAWNED', {
        description: 'Orchestration core online. Spawning specialized UX agent workers.'
      });

      // 4. Sequence tasks
      const tasks = this.delegation.routeInvestigation(goal);
      for (const task of tasks) {
        this.scheduler.addTask(task);

        // Create AgentExecution DB entry
        await this.prisma.agentExecution.create({
          data: {
            id: task.id,
            orchestrationSessionId: sessionId,
            agentType: task.agentType,
            status: 'QUEUED',
            task: task.description,
            startedAt: null,
            completedAt: null
          }
        });

        await this.timeline.logEvent('TASK_DELEGATED', {
          agentType: task.agentType,
          taskId: task.id,
          description: `Assigned task to ${task.agentType}: "${task.description}" (Priority: ${task.priority})`
        });
      }

      // 5. Execution loop
      let executableTasks = this.scheduler.getNextExecutableTasks();
      while (executableTasks.length > 0) {
        await Promise.all(
          executableTasks.map(async (task) => {
            task.status = 'RUNNING';
            await this.prisma.agentExecution.update({
              where: { id: task.id },
              data: {
                status: 'RUNNING',
                startedAt: new Date()
              }
            });

            // Spawn isolated worker
            const agent = this.createAgent(task.agentType, workflowSessionId);

            try {
              // Sandbox execute with 30s timeout
              const result = await this.executeTaskWithTimeout(agent, task);
              task.status = 'COMPLETED';
              task.result = result;

              await this.prisma.agentExecution.update({
                where: { id: task.id },
                data: {
                  status: 'COMPLETED',
                  completedAt: new Date(),
                  result
                }
              });

              // Send task completion message to broker
              await this.broker.sendMessage({
                fromAgent: task.agentType,
                toAgent: 'UX_ORCHESTRATOR',
                messageType: 'TASK_SUCCESS',
                payload: { taskId: task.id, result }
              });

            } catch (err: any) {
              const errorMsg = err.message || 'Execution failed';
              
              // Invoke failure recovery mechanics
              const { shouldRetry, updatedRetryCount } = await this.recovery.handleFailedTask(task, errorMsg);
              task.retryCount = updatedRetryCount;

              await this.prisma.agentExecution.update({
                where: { id: task.id },
                data: {
                  metadata: { error: errorMsg, retryCount: updatedRetryCount }
                }
              });

              if (shouldRetry) {
                task.status = 'QUEUED';
                await this.prisma.agentExecution.update({
                  where: { id: task.id },
                  data: { status: 'QUEUED' }
                });
              } else {
                task.status = 'FAILED';
                await this.prisma.agentExecution.update({
                  where: { id: task.id },
                  data: {
                    status: 'FAILED',
                    completedAt: new Date()
                  }
                });

                // Log task failure via broker
                await this.broker.sendMessage({
                  fromAgent: task.agentType,
                  toAgent: 'UX_ORCHESTRATOR',
                  messageType: 'TASK_FAILURE',
                  payload: { taskId: task.id, error: errorMsg }
                });
              }
            }
          })
        );

        // Fetch next set of runnable tasks (dependencies resolved)
        executableTasks = this.scheduler.getNextExecutableTasks();
      }

      // 6. Close Orchestration Session
      const finalQueue = this.scheduler.getQueue();
      const hasFailures = finalQueue.some(t => t.status === 'FAILED');
      const finalStatus = hasFailures ? 'FAILED' : 'COMPLETED';

      await this.prisma.orchestrationSession.update({
        where: { id: sessionId },
        data: {
          status: finalStatus,
          completedAt: new Date(),
          metadata: {
            tasks: finalQueue.map(t => ({ id: t.id, status: t.status, agent: t.agentType }))
          }
        }
      });

      await this.timeline.logEvent('ORCHESTRATION_COMPLETED', {
        description: `Multi-agent investigation completed with status: ${finalStatus}.`
      });

      return sessionId;
    } catch (orchestrationError: any) {
      console.error(`[OrchestratorCoordinator] Fatal orchestration error for session ${workflowSessionId}:`, orchestrationError);
      
      if (sessionId) {
        try {
          await this.prisma.orchestrationSession.update({
            where: { id: sessionId },
            data: {
              status: 'FAILED',
              completedAt: new Date(),
              metadata: { error: orchestrationError.message || 'Fatal orchestration error' }
            }
          });
        } catch (dbError) {
          console.error('[OrchestratorCoordinator] Failed to mark session as failed in DB:', dbError);
        }
      }
      throw orchestrationError;
    } finally {
      OrchestratorCoordinator.activeWorkflowSessions.delete(workflowSessionId);
    }
  }

  private createAgent(agentType: AgentType, workflowSessionId: string): BaseOrchestratedAgent {
    switch (agentType) {
      case 'VISUAL_AUDITOR':
        return new VisualAuditorAgent(this.prisma, workflowSessionId, this.context, this.broker, this.timeline);
      case 'COGNITIVE_SIMULATOR':
        return new CognitiveSimulatorAgent(this.prisma, workflowSessionId, this.context, this.broker, this.timeline);
      case 'UX_ORCHESTRATOR':
        return new UXOrchestratorAgent(this.prisma, workflowSessionId, this.context, this.broker, this.timeline);
    }
  }

  private async executeTaskWithTimeout(agent: BaseOrchestratedAgent, task: OrchestrationTask): Promise<any> {
    const timeoutMs = 30000;
    
    const taskPromise = agent.execute(task);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Agent execution timeout')), timeoutMs);
    });

    return Promise.race([taskPromise, timeoutPromise]);
  }
}
