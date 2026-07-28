import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { prisma } from '@fricta/db';
import { RealtimeEventBus } from '@fricta/realtime';
import { SimulationRunner, PersonaManager } from '@fricta/simulation-engine';
import { resolveUser } from '../middleware';
import { getCurrentUser } from '../middleware/authContext';
import { verifyProjectOwnership, verifyWorkflowOwnership } from '../guards/ownership';
import { ApiErrors } from '../utils/errors';

export const simulationRoutes = new Hono();
const runner = new SimulationRunner(prisma);


/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/simulation/personas
 * ─────────────────────────────────────────────────────────────────────────────
 */
simulationRoutes.get('/personas', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return ApiErrors.unauthorized(c);

  const projectId = c.req.query('projectId');
  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }

  const ownership = await verifyProjectOwnership(user.userId, projectId);
  if (ownership === 'NOT_FOUND') return ApiErrors.notFound(c);
  if (ownership === 'NOT_OWNED') return ApiErrors.forbidden(c);

  const profiles = await prisma.simulationProfile.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });

  return c.json({ profiles });
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/simulation/start
 * ─────────────────────────────────────────────────────────────────────────────
 */
simulationRoutes.post('/start', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return ApiErrors.unauthorized(c);

  const body = await c.req.json().catch(() => ({}));
  const { projectId, personaType, startUrl, goal } = body;

  if (!projectId || !personaType || !startUrl || !goal) {
    return c.json({ error: 'projectId, personaType, startUrl, and goal are required' }, 400);
  }

  const ownership = await verifyProjectOwnership(user.userId, projectId);
  if (ownership === 'NOT_FOUND') return ApiErrors.notFound(c);
  if (ownership === 'NOT_OWNED') return ApiErrors.forbidden(c);

  try {
    const result = await runner.run({
      projectId,
      personaType,
      startUrl,
      goal,
    });
    return c.json({ message: 'Simulation run complete', ...result });
  } catch (err: any) {
    return c.json({ error: err.message || 'Simulation execution failed' }, 500);
  }
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/simulation/exploration
 * ─────────────────────────────────────────────────────────────────────────────
 */
simulationRoutes.get('/exploration', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return ApiErrors.unauthorized(c);

  const projectId = c.req.query('projectId');
  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }

  const ownership = await verifyProjectOwnership(user.userId, projectId);
  if (ownership === 'NOT_FOUND') return ApiErrors.notFound(c);
  if (ownership === 'NOT_OWNED') return ApiErrors.forbidden(c);

  const paths = await prisma.explorationPath.findMany({
    where: {
      profile: { projectId },
    },
    include: {
      profile: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return c.json({ paths });
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/simulation/behavior
 * ─────────────────────────────────────────────────────────────────────────────
 */
simulationRoutes.get('/behavior', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return ApiErrors.unauthorized(c);

  const sessionId = c.req.query('sessionId');
  if (!sessionId) {
    return c.json({ error: 'sessionId is required' }, 400);
  }

  const ownership = await verifyWorkflowOwnership(user.userId, sessionId);
  if (ownership === 'NOT_FOUND') return ApiErrors.notFound(c);
  if (ownership === 'NOT_OWNED') return ApiErrors.forbidden(c);

  const [decisions, signals, reactions, confidenceEvents] = await Promise.all([
    prisma.behavioralDecision.findMany({ where: { workflowSessionId: sessionId }, orderBy: { stepIndex: 'asc' } }),
    prisma.hesitationSignal.findMany({ where: { workflowSessionId: sessionId }, orderBy: { stepIndex: 'asc' } }),
    prisma.frictionReaction.findMany({ where: { workflowSessionId: sessionId }, orderBy: { stepIndex: 'asc' } }),
    prisma.navigationConfidenceEvent.findMany({ where: { workflowSessionId: sessionId }, orderBy: { stepIndex: 'asc' } }),
  ]);

  return c.json({ decisions, signals, reactions, confidenceEvents });
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/simulation/replay
 * ─────────────────────────────────────────────────────────────────────────────
 */
simulationRoutes.get('/replay', async (c) => {
  const user = getCurrentUser(c);
  if (!user) return ApiErrors.unauthorized(c);

  const sessionId = c.req.query('sessionId');
  if (!sessionId) {
    return c.json({ error: 'sessionId is required' }, 400);
  }

  const ownership = await verifyWorkflowOwnership(user.userId, sessionId);
  if (ownership === 'NOT_FOUND') return ApiErrors.notFound(c);
  if (ownership === 'NOT_OWNED') return ApiErrors.forbidden(c);

  const events = await prisma.behavioralReplayEvent.findMany({
    where: { workflowSessionId: sessionId },
    orderBy: { stepIndex: 'asc' },
  });

  return c.json({ events });
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SSE WORKSPACE SIMULATION STREAM
 * ─────────────────────────────────────────────────────────────────────────────
 */
simulationRoutes.get('/stream/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');

  const user = getCurrentUser(c);
  if (!user) return ApiErrors.unauthorized(c);

  const orchestrationSession = await prisma.orchestrationSession.findFirst({
    where: { OR: [{ id: sessionId }, { workflowSessionId: sessionId }] },
    orderBy: { createdAt: 'desc' }
  });
  if (!orchestrationSession) return ApiErrors.notFound(c);

  const ownership = await verifyWorkflowOwnership(user.userId, orchestrationSession.workflowSessionId);
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
      data: JSON.stringify({ status: 'connected', sessionId }),
    });

    const bus = RealtimeEventBus.getInstance();
    const unsubscribe = bus.subscribeAll(async (event) => {
      if (isAborted) return;
      
      // Filter events targeted to this session
      if (event.orchestrationSessionId === sessionId) {
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

    // Setup ping heartbeats
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

    // Keep active
    while (!isAborted) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  });
});
