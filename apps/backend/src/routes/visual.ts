import { Hono } from 'hono';
import { PrismaClient } from '@fricta/db';
import { VisualIntelligenceCoordinator } from '@fricta/visual-intelligence';
import { getCurrentUser } from '../middleware/authContext';
import { verifyWorkflowOwnership } from '../guards/ownership';
import { ApiErrors } from '../utils/errors';

export const visualRoutes = new Hono();
const prisma = new PrismaClient();
const coordinator = new VisualIntelligenceCoordinator(prisma);

async function requireSessionAccess(c: any, sessionId: string) {
  const user = getCurrentUser(c);
  if (!user) return ApiErrors.unauthorized(c);
  const result = await verifyWorkflowOwnership(user.userId, sessionId);
  if (result === 'NOT_FOUND') return ApiErrors.notFound(c);
  if (result === 'NOT_OWNED') return ApiErrors.forbidden(c);
  return null;
}

// Retrieve all visual findings for a session
visualRoutes.get('/findings/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  const accessError = await requireSessionAccess(c, sessionId);
  if (accessError) return accessError;
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
  const accessError = await requireSessionAccess(c, sessionId);
  if (accessError) return accessError;
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
  const screenshot = await prisma.workflowScreenshot.findUnique({
    where: { id: screenshotId },
    select: { workflowSessionId: true }
  });
  if (!screenshot) return ApiErrors.notFound(c);
  const accessError = await requireSessionAccess(c, screenshot.workflowSessionId);
  if (accessError) return accessError;
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
  const accessError = await requireSessionAccess(c, sessionId);
  if (accessError) return accessError;
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
