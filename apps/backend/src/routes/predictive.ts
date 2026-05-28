import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { prisma } from '@fricta/db';
import { RealtimeEventBus } from '@fricta/realtime';
import { PredictiveForecastingEngine } from '@fricta/predictive-engine';
import { PredictiveIntelligenceEngine } from '@fricta/predictive-intelligence';
import { RBACAuthorizationGuard } from '@fricta/rbac-core';

const guard = new RBACAuthorizationGuard(prisma);

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
  return prisma.user.findFirst();
}

export const predictiveRoutes = new Hono();
const engine = new PredictiveForecastingEngine(prisma);

/**
 * GET /baselines
 * Returns all historical baselines for a project.
 */
predictiveRoutes.get('/baselines', async (c) => {
  const projectId = c.req.query('projectId');
  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }
  const baselines = await prisma.historicalBaseline.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });
  return c.json({ baselines });
});

/**
 * GET /forecasts
 * Returns all workflow forecasts for a project.
 */
predictiveRoutes.get('/forecasts', async (c) => {
  const projectId = c.req.query('projectId');
  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }
  const forecasts = await prisma.workflowForecast.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });
  return c.json({ forecasts });
});

/**
 * POST /forecasting
 * Triggers a new predictive forecasting calculation.
 */
predictiveRoutes.post('/forecasting', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { projectId, workflowPath, baselineName } = body;

  if (!projectId || !workflowPath) {
    return c.json({ error: 'projectId and workflowPath are required' }, 400);
  }

  try {
    const result = await engine.execute({
      projectId,
      workflowPath,
      baselineName,
    });
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message || 'Predictive forecasting execution failed' }, 500);
  }
});

/**
 * GET /risk
 * Returns predictive risk signals for a forecast session or the project's latest forecast.
 */
predictiveRoutes.get('/risk', async (c) => {
  const workflowForecastId = c.req.query('workflowForecastId');
  const projectId = c.req.query('projectId');

  if (!workflowForecastId && !projectId) {
    return c.json({ error: 'Either workflowForecastId or projectId is required' }, 400);
  }

  let forecastId = workflowForecastId;

  if (!forecastId && projectId) {
    const latestForecast = await prisma.workflowForecast.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    if (!latestForecast) {
      return c.json({ signals: [] });
    }
    forecastId = latestForecast.id;
  }

  const signals = await prisma.predictiveRiskSignal.findMany({
    where: { workflowForecastId: forecastId },
    orderBy: { stepIndex: 'asc' },
  });

  return c.json({ signals, forecastId });
});

/**
 * GET /regressions
 * Returns regression events for a project.
 */
predictiveRoutes.get('/regressions', async (c) => {
  const projectId = c.req.query('projectId');
  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }

  const regressions = await prisma.regressionEvent.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });

  return c.json({ regressions });
});

/**
 * GET /survivability
 */
predictiveRoutes.get('/survivability', async (c) => {
  const workflowForecastId = c.req.query('workflowForecastId');
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!workflowForecastId && !projectId) {
    return c.json({ error: 'Either workflowForecastId or projectId is required' }, 400);
  }

  if (projectId) {
    const user = await resolveUser(c);
    if (workspaceId) {
      const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'READ');
      if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
    }
    const signals = await prisma.cognitiveRiskSignal.findMany({
      where: { projectId, workspaceId: workspaceId || null },
      orderBy: { personaType: 'asc' }
    });
    return c.json({ signals });
  }

  const forecasts = await prisma.survivabilityForecast.findMany({
    where: { workflowForecastId },
    orderBy: { predictedSurvivalRate: 'desc' },
  });

  return c.json({ forecasts });
});

/**
 * GET /abandonment
 */
predictiveRoutes.get('/abandonment', async (c) => {
  const workflowForecastId = c.req.query('workflowForecastId');
  if (!workflowForecastId) {
    return c.json({ error: 'workflowForecastId is required' }, 400);
  }

  const predictions = await prisma.abandonmentPrediction.findMany({
    where: { workflowForecastId },
    orderBy: { stepIndex: 'asc' },
  });

  return c.json({ predictions });
});

/**
 * GET /timelines
 */
predictiveRoutes.get('/timelines', async (c) => {
  const workflowForecastId = c.req.query('workflowForecastId');
  if (!workflowForecastId) {
    return c.json({ error: 'workflowForecastId is required' }, 400);
  }

  const events = await prisma.predictiveTimelineEvent.findMany({
    where: { workflowForecastId },
    orderBy: { stepIndex: 'asc' },
  });

  return c.json({ events });
});

/**
 * GET /stream/:workflowForecastId
 * Real-time SSE streaming for live predictive updates.
 */
predictiveRoutes.get('/stream/:workflowForecastId', async (c) => {
  const workflowForecastId = c.req.param('workflowForecastId');

  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');
  c.header('X-Accel-Buffering', 'no');

  return streamSSE(c, async (stream) => {
    let isAborted = false;

    // Send connection success payload
    await stream.writeSSE({
      event: 'system.connected',
      data: JSON.stringify({ status: 'connected', workflowForecastId }),
    });

    const bus = RealtimeEventBus.getInstance();
    const unsubscribe = bus.subscribeAll(async (event) => {
      if (isAborted) return;

      if (event.orchestrationSessionId === workflowForecastId) {
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

/**
 * POST /forecast
 * Manually trigger the predictive pipeline analysis.
 */
predictiveRoutes.post('/forecast', async (c) => {
  const user = await resolveUser(c);
  const { projectId, workspaceId } = await c.req.json().catch(() => ({}));

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const results = await PredictiveIntelligenceEngine.runForecastPipeline(projectId, workspaceId || null);
  
  // Publish realtime predictive alerts
  try {
    const bus = RealtimeEventBus.getInstance();
    bus.publish({
      id: `pred-alert-${Date.now()}`,
      eventType: 'predictive.failure.predicted',
      orchestrationSessionId: '',
      payload: {
        projectId,
        workspaceId: workspaceId || null,
        message: 'Predictive forecasting run completed successfully',
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    // ignore
  }

  return c.json(results);
});

/**
 * GET /risks
 * Fetch workflow risk scores and metrics.
 */
predictiveRoutes.get('/risks', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const risks = await prisma.workflowRiskScore.findMany({
    where: { projectId, workspaceId: workspaceId || null },
    orderBy: { riskScore: 'desc' }
  });

  return c.json({ risks });
});

/**
 * GET /cognitive
 * Fetch choice overload and fatigue load parameters.
 */
predictiveRoutes.get('/cognitive', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const cognitiveSignals = await prisma.cognitiveRiskSignal.findMany({
    where: { projectId, workspaceId: workspaceId || null }
  });

  return c.json({ cognitiveSignals });
});

/**
 * GET /failures
 * Fetch predicted failures (CTA degradation, etc.).
 */
predictiveRoutes.get('/failures', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const failures = await prisma.uXFailurePrediction.findMany({
    where: { projectId, workspaceId: workspaceId || null },
    include: { evidence: true },
    orderBy: { probability: 'desc' }
  });

  return c.json({ failures });
});

/**
 * GET /trends
 * Fetch long-term portfolio stability projections.
 */
predictiveRoutes.get('/trends', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const memorySignals = await prisma.predictiveMemorySignal.findMany({
    where: { projectId, workspaceId: workspaceId || null }
  });

  return c.json({ memorySignals });
});

/**
 * GET /evidence
 * Fetch evidence linkages supporting predictions.
 */
predictiveRoutes.get('/evidence', async (c) => {
  const predictionId = c.req.query('predictionId');
  if (!predictionId) return c.json({ error: 'predictionId is required' }, 400);

  const evidence = await prisma.forecastEvidence.findMany({
    where: { predictionId }
  });

  return c.json({ evidence });
});
