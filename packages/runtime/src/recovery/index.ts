import { PrismaClient } from '@fricta/db';
import { Redis } from 'ioredis';
import { SessionLockManager } from '../locks';
import { QueueOrchestrator } from '../queues';
import { DistributedTelemetryService } from '../telemetry';
import { RecoveryCheckpointMetadata, RuntimeOwnershipMetadata } from '../types';
import { logger } from '@fricta/shared';

export class RecoverySupervisor {
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaClient,
    private redis: Redis,
    private lockManager: SessionLockManager,
    private queueOrchestrator: QueueOrchestrator,
    private telemetryService: DistributedTelemetryService
  ) {}

  start(intervalMs: number = 15000): void {
    logger.info('Starting Recovery Supervisor periodic audits');
    this.checkInterval = setInterval(async () => {
      try {
        await this.auditCrashedWorkers();
        await this.auditTimedOutExecutions();
      } catch (err) {
        logger.error({ err }, 'Error during recovery audit');
      }
    }, intervalMs);
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Scans all running orchestration sessions. If their owner worker is dead, trigger crash recovery.
   */
  async auditCrashedWorkers(): Promise<void> {
    const runningSessions = await this.prisma.orchestrationSession.findMany({
      where: { status: 'RUNNING' }
    });

    const activeWorkers = await this.telemetryService.getActiveWorkers();
    const activeWorkerIds = new Set(activeWorkers.map(w => w.workerId));

    for (const session of runningSessions) {
      const ownership = session.metadata as unknown as RuntimeOwnershipMetadata | null;
      if (ownership && ownership.workerId) {
        if (!activeWorkerIds.has(ownership.workerId)) {
          logger.warn(
            { sessionId: session.id, workerId: ownership.workerId },
            'Detected orchestration session owned by a crashed worker! Initiating recovery...'
          );

          await this.recoverCrashedSession(session.id, ownership.workerId);
        }
      }
    }
  }

  private async recoverCrashedSession(sessionId: string, crashedWorkerId: string): Promise<void> {
    try {
      // 1. Release locks held by crashed worker
      await this.lockManager.release(sessionId, 'execution', crashedWorkerId);

      // 2. Increment recovery event metrics
      await this.telemetryService.incrementRecoveryCount(sessionId);

      // 3. Mark session as PENDING or re-queue it
      await this.prisma.orchestrationSession.update({
        where: { id: sessionId },
        data: {
          status: 'PENDING',
          metadata: {
            recoveredFromWorkerId: crashedWorkerId,
            recoveredAt: new Date().toISOString()
          }
        }
      });

      // 4. Log recovery event in shared context
      await this.prisma.sharedContextEvent.create({
        data: {
          orchestrationSessionId: sessionId,
          eventType: 'CRASH_RECOVERY_TRIGGERED',
          payload: { crashedWorkerId, reason: 'Worker heartbeat timeout' }
        }
      });

      // 5. Re-queue the orchestration run
      await this.queueOrchestrator.enqueueOrchestration(sessionId);
      logger.info({ sessionId }, 'Successfully re-queued orchestration session after worker crash');
    } catch (err: any) {
      logger.error({ err: err.message, sessionId }, 'Failed to recover crashed orchestration session');
    }
  }

  /**
   * Audits running agent executions. If they exceed a timeout or their executing worker is dead, re-queues them.
   */
  async auditTimedOutExecutions(): Promise<void> {
    const runningExecutions = await this.prisma.agentExecution.findMany({
      where: { status: 'RUNNING' }
    });

    const activeWorkers = await this.telemetryService.getActiveWorkers();
    const activeWorkerIds = new Set(activeWorkers.map(w => w.workerId));

    for (const exec of runningExecutions) {
      const metadata = exec.metadata as any;
      const workerId = metadata?.workerId;

      if (workerId && !activeWorkerIds.has(workerId)) {
        logger.warn(
          { executionId: exec.id, workerId },
          'Agent execution worker crashed. Re-queuing task...'
        );

        await this.requeueAgentTask(exec.id, exec.orchestrationSessionId, 'Worker crash');
      }
    }
  }

  private async requeueAgentTask(
    executionId: string,
    orchestrationSessionId: string,
    reason: string
  ): Promise<void> {
    const maxRetries = 3;
    const exec = await this.prisma.agentExecution.findUnique({
      where: { id: executionId }
    });
    if (!exec) return;

    const currentRetries = (exec.metadata as any)?.retryCount || 0;

    if (currentRetries < maxRetries) {
      await this.prisma.agentExecution.update({
        where: { id: executionId },
        data: {
          status: 'QUEUED',
          metadata: {
            ...(exec.metadata as any || {}),
            retryCount: currentRetries + 1,
            lastError: reason
          }
        }
      });

      await this.prisma.sharedContextEvent.create({
        data: {
          orchestrationSessionId,
          eventType: 'AGENT_TASK_REQUEUED',
          payload: { executionId, attempt: currentRetries + 1, maxRetries }
        }
      });
    } else {
      // Partial Investigation Continuation: Mark this agent execution as failed, but let the rest proceed
      await this.prisma.agentExecution.update({
        where: { id: executionId },
        data: {
          status: 'FAILED',
          completedAt: new Date()
        }
      });

      await this.prisma.sharedContextEvent.create({
        data: {
          orchestrationSessionId,
          eventType: 'AGENT_TASK_FAILED_FATAL',
          payload: { executionId, reason: 'Exceeded maximum retries' }
        }
      });

      logger.error(
        { executionId, orchestrationSessionId },
        'Agent task reached max retries. Failing execution for partial continuation.'
      );
    }
  }

  /**
   * Reconstruction of session timeline checkpoints.
   */
  async getSessionCheckpoint(sessionId: string): Promise<RecoveryCheckpointMetadata> {
    const executions = await this.prisma.agentExecution.findMany({
      where: { orchestrationSessionId: sessionId }
    });

    const completedTaskIds: string[] = [];
    const failedTaskIds: string[] = [];
    const retryAttempts: Record<string, number> = {};

    for (const exec of executions) {
      if (exec.status === 'COMPLETED') {
        completedTaskIds.push(exec.id);
      } else if (exec.status === 'FAILED') {
        failedTaskIds.push(exec.id);
      }
      retryAttempts[exec.id] = (exec.metadata as any)?.retryCount || 0;
    }

    return {
      version: 1,
      lastMilestone: failedTaskIds.length > 0 ? 'PARTIAL_SUCCESS' : 'RUNNING',
      completedTaskIds,
      failedTaskIds,
      retryAttempts,
      updatedAt: new Date().toISOString()
    };
  }
}
