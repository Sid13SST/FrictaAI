import { PrismaClient } from '@fricta/db';
import { QueueOrchestrator } from '../queues';
import { logger } from '@fricta/shared';

export class QueueScheduler {
  private prisma: PrismaClient;
  private queueOrchestrator: QueueOrchestrator;
  private maxConcurrentSessions: number;

  constructor(
    prisma: PrismaClient,
    queueOrchestrator: QueueOrchestrator,
    maxConcurrentSessions?: number
  ) {
    this.prisma = prisma;
    this.queueOrchestrator = queueOrchestrator;
    this.maxConcurrentSessions = maxConcurrentSessions || parseInt(process.env.MAX_CONCURRENT_SESSIONS || '3', 10);
  }

  /**
   * Evaluates if we can schedule a new session immediately or if we should delay it.
   */
  async canExecuteSession(): Promise<boolean> {
    try {
      const activeCount = await this.prisma.orchestrationSession.count({
        where: { status: 'RUNNING' }
      });

      const allowed = activeCount < this.maxConcurrentSessions;
      logger.info(
        { activeCount, maxConcurrentSessions: this.maxConcurrentSessions, allowed },
        'Scheduler checking concurrency limit'
      );
      return allowed;
    } catch (err) {
      logger.error({ err }, 'Error checking concurrent sessions count');
      return false;
    }
  }

  /**
   * Submits a session to the Orchestration Queue.
   */
  async submitSession(workflowSessionId: string, priority: number = 10): Promise<string> {
    const job = await this.queueOrchestrator.enqueueOrchestration(workflowSessionId, priority);
    logger.info({ workflowSessionId, jobId: job.id }, 'Session submitted to orchestration queue');
    return job.id!;
  }
}
