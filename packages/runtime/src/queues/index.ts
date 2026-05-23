import { Queue, QueueOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { logger } from '@fricta/shared';

// Queue names
export const ORCHESTRATION_QUEUE_NAME = 'orchestration-queue';
export const AGENT_TASK_QUEUE_NAME = 'agent-task-queue';
export const REPLAY_PROCESSING_QUEUE_NAME = 'replay-processing-queue';
export const SCREENSHOT_PROCESSING_QUEUE_NAME = 'screenshot-processing-queue';
export const CORRELATION_QUEUE_NAME = 'correlation-queue';
export const RECOVERY_QUEUE_NAME = 'recovery-queue';
export const EXPORT_QUEUE_NAME = 'export-queue';

export class QueueOrchestrator {
  private redisConnection: Redis;
  private queues: Map<string, Queue> = new Map();

  constructor(redisOrUrl?: Redis | string) {
    if (redisOrUrl instanceof Redis) {
      this.redisConnection = redisOrUrl;
    } else {
      const url = redisOrUrl || process.env.REDIS_URL || 'redis://localhost:6379';
      this.redisConnection = new Redis(url, { maxRetriesPerRequest: null });
    }

    this.initializeQueues();
  }

  private initializeQueues() {
    const queueNames = [
      ORCHESTRATION_QUEUE_NAME,
      AGENT_TASK_QUEUE_NAME,
      REPLAY_PROCESSING_QUEUE_NAME,
      SCREENSHOT_PROCESSING_QUEUE_NAME,
      CORRELATION_QUEUE_NAME,
      RECOVERY_QUEUE_NAME,
      EXPORT_QUEUE_NAME,
    ];

    const defaultQueueOpts: QueueOptions = {
      connection: this.redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: { age: 3600 }, // Keep completed jobs for an hour for telemetry
        removeOnFail: false,
      },
    };

    for (const name of queueNames) {
      const q = new Queue(name, defaultQueueOpts);
      this.queues.set(name, q);
      logger.info({ queueName: name }, 'Queue initialized');
    }
  }

  getQueue(name: string): Queue | undefined {
    return this.queues.get(name);
  }

  getConnection(): Redis {
    return this.redisConnection;
  }

  async enqueueOrchestration(workflowSessionId: string, priority: number = 10): Promise<any> {
    const q = this.getQueue(ORCHESTRATION_QUEUE_NAME);
    if (!q) throw new Error(`Queue ${ORCHESTRATION_QUEUE_NAME} not found`);

    return await q.add(
      'orchestrate',
      { workflowSessionId },
      { priority }
    );
  }

  async enqueueAgentTask(
    orchestrationSessionId: string,
    workflowSessionId: string,
    taskId: string,
    agentType: string,
    task: string,
    priority: number = 10
  ): Promise<any> {
    const q = this.getQueue(AGENT_TASK_QUEUE_NAME);
    if (!q) throw new Error(`Queue ${AGENT_TASK_QUEUE_NAME} not found`);

    return await q.add(
      'execute-task',
      { orchestrationSessionId, workflowSessionId, taskId, agentType, task },
      { priority }
    );
  }

  async enqueueReplayProcessing(orchestrationSessionId: string, workflowSessionId: string): Promise<any> {
    const q = this.getQueue(REPLAY_PROCESSING_QUEUE_NAME);
    if (!q) throw new Error(`Queue ${REPLAY_PROCESSING_QUEUE_NAME} not found`);

    return await q.add('process-replay', { orchestrationSessionId, workflowSessionId });
  }

  async enqueueScreenshotProcessing(
    workflowSessionId: string,
    screenshotId: string,
    filePath: string
  ): Promise<any> {
    const q = this.getQueue(SCREENSHOT_PROCESSING_QUEUE_NAME);
    if (!q) throw new Error(`Queue ${SCREENSHOT_PROCESSING_QUEUE_NAME} not found`);

    return await q.add('process-screenshot', { workflowSessionId, screenshotId, filePath });
  }

  async enqueueCorrelation(orchestrationSessionId: string): Promise<any> {
    const q = this.getQueue(CORRELATION_QUEUE_NAME);
    if (!q) throw new Error(`Queue ${CORRELATION_QUEUE_NAME} not found`);

    return await q.add('run-correlation', { orchestrationSessionId });
  }

  async enqueueRecovery(orchestrationSessionId: string, failureReason: string): Promise<any> {
    const q = this.getQueue(RECOVERY_QUEUE_NAME);
    if (!q) throw new Error(`Queue ${RECOVERY_QUEUE_NAME} not found`);

    return await q.add('recover-session', { orchestrationSessionId, failureReason });
  }

  async enqueueExport(orchestrationSessionId: string, format: 'json' | 'pdf' = 'json'): Promise<any> {
    const q = this.getQueue(EXPORT_QUEUE_NAME);
    if (!q) throw new Error(`Queue ${EXPORT_QUEUE_NAME} not found`);

    return await q.add('export-report', { orchestrationSessionId, format });
  }

  async closeAll(): Promise<void> {
    for (const [name, q] of this.queues) {
      await q.close();
      logger.info({ queueName: name }, 'Queue closed');
    }
    await this.redisConnection.quit();
  }
}
