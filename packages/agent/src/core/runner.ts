import { PrismaClient } from '@prisma/client';
import { BrowserManager } from '../browser/manager';
import { AgentLoop } from './loop';
import { createAIProvider } from '../providers';
import { logger } from '@fricta/shared';

const prisma = new PrismaClient();
const browserManager = new BrowserManager();

export interface RunWorkflowOptions {
  projectId: string;
  sessionId: string;
  goal: string;
  persona?: string;
  model?: string;
  url?: string;
}

export const runWorkflow = async (options: RunWorkflowOptions) => {
  const { sessionId, goal, persona = 'Tech-Savvy User', url: targetUrl } = options;
  
  const session = await prisma.workflowSession.findUnique({
    where: { id: sessionId },
    include: { project: true }
  });

  if (!session || !session.project) {
    throw new Error('Session or project not found');
  }

  let url = targetUrl || session.project.websiteUrl;
  url = url.trim();
  if (!/^https?:\/\//i.test(url)) {
    if (/^(localhost|127\.0\.0\.1)(:\d+)?/i.test(url)) {
      url = `http://${url}`;
    } else {
      url = `https://${url}`;
    }
  }

  let provider;
  try {
    provider = createAIProvider('openrouter');
  } catch (err: any) {
    throw new Error(`AI provider setup failed: ${err.message}`);
  }

  try {
    await browserManager.launch(true);
    const context = await browserManager.createContext(sessionId);
    const page = await context.newPage();

    logger.info({ sessionId, url }, 'Agent navigating to target URL');
    await page.goto(url, { waitUntil: 'load', timeout: 15_000 }).catch((gotoErr) => {
      logger.error({ sessionId, url, err: gotoErr.message }, 'Initial page navigation failed');
    });

    const loop = new AgentLoop(provider, { maxSteps: 30 });

    const finalState = await loop.run(
      sessionId,
      goal,
      persona,
      page,
      {
        onThought: async (thought, step) => {
          logger.info(`[Agent:${sessionId.slice(0, 8)}] Step ${step} thought: ${thought.slice(0, 80)}`);
          // Update stepCount on every thought so the progress bar advances on every step
          await Promise.all([
            prisma.agentThought.create({
              data: { workflowSessionId: sessionId, thought, stepNumber: step }
            }).catch(err => logger.error({ err }, 'Failed to save thought')),
            prisma.workflowSession.update({
              where: { id: sessionId },
              data: { stepCount: step }
            }).catch(() => {}),
          ]);
        },
        onAction: async (executed) => {
          await prisma.agentAction.create({
            data: {
              workflowSessionId: sessionId,
              action: executed.action,
              target: executed.target,
              value: executed.value,
              status: executed.status,
              stepNumber: executed.stepNumber,
              errorMessage: executed.errorMessage,
            }
          }).catch(err => logger.error({ err }, 'Failed to save action'));
          
          await prisma.workflowSession.update({
            where: { id: sessionId },
            data: { stepCount: executed.stepNumber }
          }).catch(() => {});
        },
        onComplete: async (state) => {
          const dbStatus = state.status === 'completed' ? 'COMPLETED'
            : state.status === 'timeout' ? 'TIMEOUT'
            : state.status === 'loop_detected' ? 'LOOP_DETECTED'
            : 'FAILED';
          await prisma.workflowSession.update({
             where: { id: sessionId },
             data: { status: dbStatus, endedAt: new Date(), stepCount: state.currentStep }
          }).catch(() => {});
        },
        onError: async (error, state) => {
          logger.error({ error: error.message }, 'Agent Loop Error');
          await prisma.workflowSession.update({
             where: { id: sessionId },
             data: { status: 'FAILED', endedAt: new Date(), stepCount: state.currentStep }
          }).catch(() => {});
        },
      },
      {}
    );

    logger.info({ status: finalState.status }, 'Agent run completed');
  } finally {
    try {
      await browserManager.closeContext(sessionId);
    } catch {}
  }
};
