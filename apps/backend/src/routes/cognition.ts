import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import { getCurrentUser } from '../middleware/authContext';
import { verifyWorkflowOwnership } from '../guards/ownership';
import { ApiErrors } from '../utils/errors';

export const cognitionRoutes = new Hono();

// Every route below is scoped by a workflowSessionId query param — verify
// ownership before any cognitive-signal data is returned.
cognitionRoutes.use('*', async (c, next) => {
  const user = getCurrentUser(c);
  if (!user) return ApiErrors.unauthorized(c);

  const sessionId = c.req.query('sessionId');
  if (!sessionId) {
    return c.json({ error: 'sessionId is required' }, 400);
  }

  const ownership = await verifyWorkflowOwnership(user.userId, sessionId);
  if (ownership === 'NOT_FOUND') return ApiErrors.notFound(c);
  if (ownership === 'NOT_OWNED') return ApiErrors.forbidden(c);

  await next();
});

/**
 * GET /api/cognition/confidence
 */
cognitionRoutes.get('/confidence', async (c) => {
  const sessionId = c.req.query('sessionId');
  if (!sessionId) {
    return c.json({ error: 'sessionId is required' }, 400);
  }

  const signals = await prisma.confidenceSignal.findMany({
    where: { workflowSessionId: sessionId },
    orderBy: { stepIndex: 'asc' },
  });

  return c.json({ signals });
});

/**
 * GET /api/cognition/load
 */
cognitionRoutes.get('/load', async (c) => {
  const sessionId = c.req.query('sessionId');
  if (!sessionId) {
    return c.json({ error: 'sessionId is required' }, 400);
  }

  const states = await prisma.cognitiveState.findMany({
    where: { workflowSessionId: sessionId },
    orderBy: { stepIndex: 'asc' },
  });

  return c.json({ states });
});

/**
 * GET /api/cognition/attention
 */
cognitionRoutes.get('/attention', async (c) => {
  const sessionId = c.req.query('sessionId');
  if (!sessionId) {
    return c.json({ error: 'sessionId is required' }, 400);
  }

  const events = await prisma.attentionEvent.findMany({
    where: { workflowSessionId: sessionId },
    orderBy: { stepIndex: 'asc' },
  });

  return c.json({ events });
});

/**
 * GET /api/cognition/expectation
 */
cognitionRoutes.get('/expectation', async (c) => {
  const sessionId = c.req.query('sessionId');
  if (!sessionId) {
    return c.json({ error: 'sessionId is required' }, 400);
  }

  const mismatches = await prisma.expectationMismatch.findMany({
    where: { workflowSessionId: sessionId },
    orderBy: { stepIndex: 'asc' },
  });

  return c.json({ mismatches });
});

/**
 * GET /api/cognition/abandonment
 */
cognitionRoutes.get('/abandonment', async (c) => {
  const sessionId = c.req.query('sessionId');
  if (!sessionId) {
    return c.json({ error: 'sessionId is required' }, 400);
  }

  const signals = await prisma.abandonmentRiskSignal.findMany({
    where: { workflowSessionId: sessionId },
    orderBy: { stepIndex: 'asc' },
  });

  return c.json({ signals });
});

/**
 * GET /api/cognition/decisioning
 */
cognitionRoutes.get('/decisioning', async (c) => {
  const sessionId = c.req.query('sessionId');
  if (!sessionId) {
    return c.json({ error: 'sessionId is required' }, 400);
  }

  const events = await prisma.decisionComplexityEvent.findMany({
    where: { workflowSessionId: sessionId },
    orderBy: { stepIndex: 'asc' },
  });

  return c.json({ events });
});

/**
 * GET /api/cognition/timeline
 */
cognitionRoutes.get('/timeline', async (c) => {
  const sessionId = c.req.query('sessionId');
  if (!sessionId) {
    return c.json({ error: 'sessionId is required' }, 400);
  }

  const events = await prisma.cognitiveTimelineEvent.findMany({
    where: { workflowSessionId: sessionId },
    orderBy: { stepIndex: 'asc' },
  });

  return c.json({ events });
});
