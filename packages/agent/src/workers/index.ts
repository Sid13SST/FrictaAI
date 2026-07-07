import { Worker, Job } from 'bullmq';
import { connection } from '../queue/connection';
import { WORKFLOW_QUEUE_NAME } from '../queue';
import { WorkflowJobData } from '../scheduler';
import { logger } from '@fricta/shared';
import { PrismaClient } from '@fricta/db';
import { runWorkflow } from '../index'; // Will refactor this to use the Agent directly

const prisma = new PrismaClient();

export const startWorker = () => {
  logger.info('Starting BullMQ worker');
  
  const worker = new Worker<WorkflowJobData>(
    WORKFLOW_QUEUE_NAME,
    async (job: Job<WorkflowJobData>) => {
      logger.info({ jobId: job.id, sessionId: job.data.sessionId }, 'Processing workflow job');
      
      await prisma.workflowSession.update({
        where: { id: job.data.sessionId },
        data: { 
          status: 'RUNNING',
          startedAt: new Date(),
          queueJobId: job.id
        }
      });

      try {
        await runWorkflow({
          projectId: job.data.projectId,
          sessionId: job.data.sessionId,
          goal: job.data.goal,
          persona: job.data.persona,
          model: job.data.model,
          url: job.data.url,
        });

        logger.info({ jobId: job.id, sessionId: job.data.sessionId }, 'Workflow job completed successfully');
      } catch (err) {
        logger.error({ jobId: job.id, sessionId: job.data.sessionId, err }, 'Workflow job execution threw an error');
        throw err;
      }
    },
    {
      connection,
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),
    }
  );

  worker.on('failed', async (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Job failed');
    if (job?.data?.sessionId) {
       await prisma.workflowSession.update({
         where: { id: job.data.sessionId },
         data: { status: 'FAILED' }
       });
    }
  });

  return worker;
};
