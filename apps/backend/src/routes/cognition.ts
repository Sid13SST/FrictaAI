import { Hono } from 'hono';
import { prisma } from '@fricta/db';

export const cognitionRoutes = new Hono();

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
