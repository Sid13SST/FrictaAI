import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { prisma } from '@fricta/db';
import { RealtimeEventBus } from '@fricta/realtime';
import { SimulationRunner, PersonaManager } from '@fricta/simulation-engine';

export const simulationRoutes = new Hono();
const runner = new SimulationRunner(prisma);

// Helper to get active user
async function resolveUser(c: any): Promise<any> {
  const userId = c.req.query('userId') || c.req.header('X-User-Id');
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) return user;
  }
  
  const email = c.req.query('email') || c.req.header('X-User-Email');
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) return user;
  }

  // Fallback to first user in db
  const defaultUser = await prisma.user.findFirst();
  return defaultUser;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/simulation/personas
 * ─────────────────────────────────────────────────────────────────────────────
 */
simulationRoutes.get('/personas', async (c) => {
  const projectId = c.req.query('projectId');
  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }

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
  const body = await c.req.json().catch(() => ({}));
  const { projectId, personaType, startUrl, goal } = body;

  if (!projectId || !personaType || !startUrl || !goal) {
    return c.json({ error: 'projectId, personaType, startUrl, and goal are required' }, 400);
  }

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
  const projectId = c.req.query('projectId');
  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }

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
  const sessionId = c.req.query('sessionId');
  if (!sessionId) {
    return c.json({ error: 'sessionId is required' }, 400);
  }

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
  const sessionId = c.req.query('sessionId');
  if (!sessionId) {
    return c.json({ error: 'sessionId is required' }, 400);
  }

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
