import { Hono } from 'hono';
import { PrismaClient } from '@fricta/db';
import { VisualIntelligenceCoordinator } from '@fricta/visual-intelligence';

export const visualRoutes = new Hono();
const prisma = new PrismaClient();
const coordinator = new VisualIntelligenceCoordinator(prisma);

// Retrieve all visual findings for a session
visualRoutes.get('/findings/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  try {
    const findings = await prisma.visualFinding.findMany({
      where: { workflowSessionId: sessionId },
      orderBy: { timestamp: 'asc' }
    });
    return c.json({ findings });
  } catch (error: any) {
    console.error(`[Backend] Failed to fetch visual findings for session ${sessionId}:`, error.message);
    return c.json({ error: error.message }, 500);
  }
});

// Retrieve the visual score for a session
visualRoutes.get('/scores/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  try {
    const score = await prisma.visualScore.findFirst({
      where: { workflowSessionId: sessionId },
      orderBy: { createdAt: 'desc' }
    });
    return c.json({ score });
  } catch (error: any) {
    console.error(`[Backend] Failed to fetch visual score for session ${sessionId}:`, error.message);
    return c.json({ error: error.message }, 500);
  }
});

// Retrieve visual findings/annotations for a specific screenshot
visualRoutes.get('/annotations/:screenshotId', async (c) => {
  const screenshotId = c.req.param('screenshotId');
  try {
    const findings = await prisma.visualFinding.findMany({
      where: { screenshotId }
    });
    return c.json({ findings });
  } catch (error: any) {
    console.error(`[Backend] Failed to fetch visual findings for screenshot ${screenshotId}:`, error.message);
    return c.json({ error: error.message }, 500);
  }
});

// Trigger visual intelligence analysis for a session
visualRoutes.post('/analyze/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  const body = await c.req.json().catch(() => ({}));
  const { forceAIVision } = body;

  try {
    const result = await coordinator.analyzeSession(sessionId, {
      forceAIVision: !!forceAIVision
    });
    return c.json(result);
  } catch (error: any) {
    console.error(`[Backend] Visual analysis failed for session ${sessionId}:`, error.message);
    return c.json({ error: error.message }, 500);
  }
});
