import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { prisma } from '@fricta/db';
import { RealtimeEventBus } from '@fricta/realtime';
import { SwarmOrchestrator, SwarmPersonaManager } from '@fricta/swarm-engine';

export const swarmRoutes = new Hono();
const orchestrator = new SwarmOrchestrator(prisma);

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
  const projectId = c.req.query('projectId');
  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }
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
  const body = await c.req.json().catch(() => ({}));
  const { projectId, startUrl, goal, personas } = body;

  if (!projectId || !startUrl || !goal || !personas || !Array.isArray(personas)) {
    return c.json({ error: 'projectId, startUrl, goal, and personas array are required' }, 400);
  }

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
  const swarmSessionId = c.req.query('swarmSessionId');
  if (!swarmSessionId) {
    return c.json({ error: 'swarmSessionId query parameter is required' }, 400);
  }

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
  const swarmSessionId = c.req.query('swarmSessionId');
  if (!swarmSessionId) {
    return c.json({ error: 'swarmSessionId query parameter is required' }, 400);
  }

  const metrics = await prisma.workflowSurvivabilityMetric.findFirst({
    where: { swarmSessionId },
  });

  return c.json({ metrics });
});

/**
 * GET /analytics
 */
swarmRoutes.get('/analytics', async (c) => {
  const swarmSessionId = c.req.query('swarmSessionId');
  if (!swarmSessionId) {
    return c.json({ error: 'swarmSessionId query parameter is required' }, 400);
  }

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
  const swarmSessionId = c.req.query('swarmSessionId');
  if (!swarmSessionId) {
    return c.json({ error: 'swarmSessionId query parameter is required' }, 400);
  }

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
  const swarmSessionId = c.req.query('swarmSessionId');
  if (!swarmSessionId) {
    return c.json({ error: 'swarmSessionId query parameter is required' }, 400);
  }

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
