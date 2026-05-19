import { Job } from 'bullmq';
import { workflowQueue } from '../queue';
import { logger } from '@fricta/shared';

export interface WorkflowJobData {
  sessionId: string;
  projectId: string;
  goal: string;
  persona?: string;
  model?: string;
  url?: string;
}

export const scheduleWorkflow = async (data: WorkflowJobData): Promise<Job> => {
  logger.info({ sessionId: data.sessionId }, 'Scheduling workflow job');
  const job = await workflowQueue.add('execute-workflow', data);
  return job;
};
