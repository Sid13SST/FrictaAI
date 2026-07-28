import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { prisma } from '@fricta/db';
import { RealtimeEventBus } from '@fricta/realtime';
import { SwarmOrchestrator, SwarmPersonaManager } from '@fricta/swarm-engine';
import { getCurrentUser } from '../middleware/authContext';
import { verifyProjectOwnership } from '../guards/ownership';
import { ApiErrors } from '../utils/errors';

export const swarmRoutes = new Hono();
const orchestrator = new SwarmOrchestrator(prisma);

// Swarm sessions carry a projectId but are looked up by swarmSessionId in
// most routes below — resolve to the owning project and verify.
async function verifySwarmSessionOwnership(userId: string, swarmSessionId: string): Promise<'OWNED' | 'NOT_OWNED' | 'NOT_FOUND'> {
  const swarmSession = await prisma.swarmSession.findUnique({
    where: { id: swarmSessionId },
    select: { projectId: true }
  });
  if (!swarmSession) return 'NOT_FOUND';
  return verifyProjectOwnership(userId, swarmSession.projectId);
}

/**
 * GET /personas
 * Returns all available persona presets.
 */
swarmRoutes.get('/personas', (c) => {
  const presets = SwarmPersonaManager.getAllPresets();
  const list = Object.entries(presets).map(([key, traits]) => ({
    type: key,
    displayName: SwarmPersonaManager.getDisplayName(key as any),
    traits,
  }));
  return c.json({ personas: list });
});

/**
 * GET /sessions
 * Returns all swarm sessions for a project.
 */
swarmRoutes.get('/sessions', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return ApiErrors.unauthorized(c);

  const projectId = c.req.query('projectId');
  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }

  const ownership = await verifyProjectOwnership(user.userId, projectId);
  if (ownership === 'NOT_FOUND') return ApiErrors.notFound(c);
  if (ownership === 'NOT_OWNED') return ApiErrors.forbidden(c);

  const sessions = await prisma.swarmSession.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });
  return c.json({ sessions });
});

/**
 * POST /executions
 * Triggers a swarm execution session concurrently.
 */
swarmRoutes.post('/executions', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return ApiErrors.unauthorized(c);

  const body = await c.req.json().catch(() => ({}));
  const { projectId, startUrl, goal, personas } = body;

  if (!projectId || !startUrl || !goal || !personas || !Array.isArray(personas)) {
    return c.json({ error: 'projectId, startUrl, goal, and personas array are required' }, 400);
  }

  const ownership = await verifyProjectOwnership(user.userId, projectId);
  if (ownership === 'NOT_FOUND') return ApiErrors.notFound(c);
  if (ownership === 'NOT_OWNED') return ApiErrors.forbidden(c);

  try {
    const result = await orchestrator.execute({
      projectId,
      startUrl,
      goal,
      personas,
    });
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message || 'Swarm execution failed' }, 500);
  }
});

/**
 * GET /divergence
 */
swarmRoutes.get('/divergence', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return ApiErrors.unauthorized(c);

  const swarmSessionId = c.req.query('swarmSessionId');
  if (!swarmSessionId) {
    return c.json({ error: 'swarmSessionId query parameter is required' }, 400);
  }

  const ownership = await verifySwarmSessionOwnership(user.userId, swarmSessionId);
  if (ownership === 'NOT_FOUND') return ApiErrors.notFound(c);
  if (ownership === 'NOT_OWNED') return ApiErrors.forbidden(c);

  const events = await prisma.divergenceEvent.findMany({
    where: { swarmSessionId },
    orderBy: { stepIndex: 'asc' },
  });

  return c.json({ events });
});

/**
 * GET /survivability
 */
swarmRoutes.get('/survivability', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return ApiErrors.unauthorized(c);

  const swarmSessionId = c.req.query('swarmSessionId');
  if (!swarmSessionId) {
    return c.json({ error: 'swarmSessionId query parameter is required' }, 400);
  }

  const ownership = await verifySwarmSessionOwnership(user.userId, swarmSessionId);
  if (ownership === 'NOT_FOUND') return ApiErrors.notFound(c);
  if (ownership === 'NOT_OWNED') return ApiErrors.forbidden(c);

  const metrics = await prisma.workflowSurvivabilityMetric.findFirst({
    where: { swarmSessionId },
  });

  return c.json({ metrics });
});

/**
 * GET /analytics
 */
swarmRoutes.get('/analytics', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return ApiErrors.unauthorized(c);

  const swarmSessionId = c.req.query('swarmSessionId');
  if (!swarmSessionId) {
    return c.json({ error: 'swarmSessionId query parameter is required' }, 400);
  }

  const ownership = await verifySwarmSessionOwnership(user.userId, swarmSessionId);
  if (ownership === 'NOT_FOUND') return ApiErrors.notFound(c);
  if (ownership === 'NOT_OWNED') return ApiErrors.forbidden(c);

  const comparisons = await prisma.personaComparison.findMany({
    where: { swarmSessionId },
  });

  const executions = await prisma.personaExecution.findMany({
    where: { swarmSessionId },
    include: { replays: true },
  });

  return c.json({ comparisons, executions });
});

/**
 * GET /replay
 */
swarmRoutes.get('/replay', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return ApiErrors.unauthorized(c);

  const swarmSessionId = c.req.query('swarmSessionId');
  if (!swarmSessionId) {
    return c.json({ error: 'swarmSessionId query parameter is required' }, 400);
  }

  const ownership = await verifySwarmSessionOwnership(user.userId, swarmSessionId);
  if (ownership === 'NOT_FOUND') return ApiErrors.notFound(c);
  if (ownership === 'NOT_OWNED') return ApiErrors.forbidden(c);

  const executions = await prisma.personaExecution.findMany({
    where: { swarmSessionId },
    include: {
      replays: {
        orderBy: { stepIndex: 'asc' },
      },
    },
  });

  return c.json({ executions });
});

/**
 * GET /heatmaps
 */
swarmRoutes.get('/heatmaps', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return ApiErrors.unauthorized(c);

  const swarmSessionId = c.req.query('swarmSessionId');
  if (!swarmSessionId) {
    return c.json({ error: 'swarmSessionId query parameter is required' }, 400);
  }

  const ownership = await verifySwarmSessionOwnership(user.userId, swarmSessionId);
  if (ownership === 'NOT_FOUND') return ApiErrors.notFound(c);
  if (ownership === 'NOT_OWNED') return ApiErrors.forbidden(c);

  const heatmaps = await prisma.populationHeatmap.findMany({
    where: { swarmSessionId },
  });

  return c.json({ heatmaps });
});

/**
 * GET /stream/:swarmSessionId
 * Real-time SSE streaming for live swarm progress updates.
 */
swarmRoutes.get('/stream/:swarmSessionId', async (c) => {
  const swarmSessionId = c.req.param('swarmSessionId');

  const user = getCurrentUser(c);
  if (!user) return ApiErrors.unauthorized(c);

  const ownership = await verifySwarmSessionOwnership(user.userId, swarmSessionId);
  if (ownership === 'NOT_FOUND') return ApiErrors.notFound(c);
  if (ownership === 'NOT_OWNED') return ApiErrors.forbidden(c);

  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');
  c.header('X-Accel-Buffering', 'no');

  return streamSSE(c, async (stream) => {
    let isAborted = false;

    // Send connection success payload
    await stream.writeSSE({
      event: 'system.connected',
      data: JSON.stringify({ status: 'connected', swarmSessionId }),
    });

    const bus = RealtimeEventBus.getInstance();
    const unsubscribe = bus.subscribeAll(async (event) => {
      if (isAborted) return;

      if (event.orchestrationSessionId === swarmSessionId) {
        try {
          await stream.writeSSE({
            event: event.eventType,
            id: event.id,
            data: JSON.stringify(event.payload),
          });
        } catch (writeErr) {
          // ignore
        }
      }
    });

    // Ping timer
    const pingTimer = setInterval(async () => {
      if (isAborted) return;
      try {
        await stream.writeSSE({
          event: 'ping',
          data: JSON.stringify({ timestamp: Date.now() }),
        });
      } catch (err) {
        isAborted = true;
        clearInterval(pingTimer);
        unsubscribe();
      }
    }, 15000);

    stream.onAbort(() => {
      isAborted = true;
      clearInterval(pingTimer);
      unsubscribe();
    });

    while (!isAborted) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  });
});
