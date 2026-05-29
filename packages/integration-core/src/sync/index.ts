import { prisma } from '@fricta/db';
import { IntegrationProvider, SyncJobStatus } from '../types';

/**
 * SyncJobOrchestrator — async sync job queue with retry and dead-letter infrastructure.
 *
 * Manages all async integration sync operations: replay link propagation,
 * evidence pushes, ticket creation, webhook processing.
 * Keeps integrations asynchronous, observable, and failure-tolerant.
 */
export class SyncJobOrchestrator {
  /**
   * Enqueue a new sync job for async processing.
   */
  static async enqueue(
    integrationId: string,
    provider: IntegrationProvider,
    jobType: string,
    payload: Record<string, any>,
    maxRetries = 3,
    scheduledAt?: Date
  ): Promise<string> {
    const job = await prisma.syncJob.create({
      data: {
        workspaceIntegrationId: integrationId,
        provider,
        jobType,
        status: 'QUEUED',
        payload,
        maxRetries,
        scheduledAt: scheduledAt ?? new Date()
      }
    });

    return job.id;
  }

  /**
   * Mark a job as running (claimed by a worker).
   */
  static async markRunning(jobId: string): Promise<void> {
    await prisma.syncJob.update({
      where: { id: jobId },
      data: { status: 'RUNNING', startedAt: new Date() }
    });
  }

  /**
   * Mark a job as completed with an optional result payload.
   */
  static async markCompleted(jobId: string, result?: Record<string, any>): Promise<void> {
    await prisma.syncJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', result, completedAt: new Date() }
    });
  }

  /**
   * Handle job failure — increment retryCount, optionally move to dead-letter.
   */
  static async markFailed(jobId: string, errorMessage: string): Promise<void> {
    const job = await prisma.syncJob.findUnique({ where: { id: jobId } });
    if (!job) return;

    const newRetryCount = job.retryCount + 1;
    const newStatus: string = newRetryCount >= job.maxRetries ? 'DEAD_LETTER' : 'QUEUED';

    await prisma.syncJob.update({
      where: { id: jobId },
      data: {
        status: newStatus,
        retryCount: newRetryCount,
        errorMessage,
        // Re-schedule with exponential backoff
        scheduledAt: newStatus === 'QUEUED'
          ? new Date(Date.now() + Math.pow(2, newRetryCount) * 30_000)
          : undefined
      }
    });
  }

  /**
   * List sync jobs for a given integration with optional status filter.
   */
  static async listJobs(
    integrationId: string,
    status?: SyncJobStatus
  ): Promise<any[]> {
    return prisma.syncJob.findMany({
      where: { workspaceIntegrationId: integrationId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }
}
