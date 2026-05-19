import { Queue } from 'bullmq';
import { connection } from './connection';
import { logger } from '@fricta/shared';

export const WORKFLOW_QUEUE_NAME = 'workflow-execution';

export const workflowQueue = new Queue(WORKFLOW_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

logger.info({ queueName: WORKFLOW_QUEUE_NAME }, 'Workflow queue initialized');
