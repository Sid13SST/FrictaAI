import { Hono } from 'hono';
import { PrismaClient } from '@fricta/db';
import {
  SharedMemoryStorage,
  SharedMemoryTimelineCompiler,
  SharedMemorySignalAggregator,
  SharedMemoryReasoningEngine
} from '@fricta/shared-memory';
import { getCurrentUser } from '../middleware/authContext';
import { verifyWorkflowOwnership } from '../guards/ownership';
import { ApiErrors } from '../utils/errors';

export const memoryRoutes = new Hono();
const prisma = new PrismaClient();

// `:sessionId` here is an orchestrationSessionId (or workflowSessionId — the
// storage classes accept either). Resolve to the owning workflow session and
// verify the requester owns it before any shared-memory data is returned.
memoryRoutes.use('*', async (c, next) => {
  const sessionId = c.req.param('sessionId');
  if (!sessionId) return next();

  const user = getCurrentUser(c);
  if (!user) return ApiErrors.unauthorized(c);

  const orchestrationSession = await prisma.orchestrationSession.findFirst({
    where: {
      OR: [
        { id: sessionId },
        { workflowSessionId: sessionId }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!orchestrationSession) return ApiErrors.notFound(c);

  const ownership = await verifyWorkflowOwnership(user.userId, orchestrationSession.workflowSessionId);
  if (ownership === 'NOT_FOUND') return ApiErrors.notFound(c);
  if (ownership === 'NOT_OWNED') return ApiErrors.forbidden(c);

  await next();
});

// GET /api/memory/:sessionId
memoryRoutes.get('/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  try {
    const storage = new SharedMemoryStorage(prisma, sessionId);
    const events = await storage.getEvents();
    return c.json({ events });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/memory/:sessionId/correlations
memoryRoutes.get('/:sessionId/correlations', async (c) => {
  const sessionId = c.req.param('sessionId');
  try {
    const storage = new SharedMemoryStorage(prisma, sessionId);
    const correlations = await storage.getCorrelations();
    return c.json({ correlations });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/memory/:sessionId/insights
memoryRoutes.get('/:sessionId/insights', async (c) => {
  const sessionId = c.req.param('sessionId');
  try {
    const storage = new SharedMemoryStorage(prisma, sessionId);
    const insights = await storage.getInsights();
    return c.json({ insights });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/memory/:sessionId/snapshots
memoryRoutes.get('/:sessionId/snapshots', async (c) => {
  const sessionId = c.req.param('sessionId');
  try {
    const storage = new SharedMemoryStorage(prisma, sessionId);
    const snapshots = await storage.getSnapshots();
    return c.json({ snapshots });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/memory/:sessionId/timeline
memoryRoutes.get('/:sessionId/timeline', async (c) => {
  const sessionId = c.req.param('sessionId');
  try {
    const compiler = new SharedMemoryTimelineCompiler(prisma, sessionId);
    const timeline = await compiler.compileTimeline();
    return c.json({ timeline });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/memory/:sessionId/signals
memoryRoutes.get('/:sessionId/signals', async (c) => {
  const sessionId = c.req.param('sessionId');
  try {
    const aggregator = new SharedMemorySignalAggregator(prisma, sessionId);
    const signals = await aggregator.aggregateSignals();
    return c.json({ signals });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/memory/:sessionId/recommendations
memoryRoutes.get('/:sessionId/recommendations', async (c) => {
  const sessionId = c.req.param('sessionId');
  try {
    const reasoningEngine = new SharedMemoryReasoningEngine(prisma, sessionId);
    const recommendations = await reasoningEngine.compileRecommendations();
    return c.json({ recommendations });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});
