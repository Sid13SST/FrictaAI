import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import { HistoricalIntelligencePipeline } from '@fricta/historical-intelligence';
import { getCurrentUser } from '../middleware/authContext';
import { verifyProjectOwnership } from '../guards/ownership';
import { ApiErrors } from '../utils/errors';

export const historicalRoutes = new Hono()
  /**
   * Every route below is scoped to a projectId (query param on GETs, path
   * param on the /analyze POST) — verify ownership before touching any data.
   */
  .use('*', async (c, next) => {
    const user = getCurrentUser(c);
    if (!user) return ApiErrors.unauthorized(c);

    const projectId = c.req.query('projectId') || c.req.param('projectId');
    if (!projectId) {
      return c.json({ error: 'Missing projectId query parameter' }, 400);
    }

    const ownership = await verifyProjectOwnership(user.userId, projectId);
    if (ownership === 'NOT_FOUND') return ApiErrors.notFound(c);
    if (ownership === 'NOT_OWNED') return ApiErrors.forbidden(c);

    await next();
  })
  /**
   * GET /api/historical/patterns
   * Returns all recurring UX friction patterns for a project.
   */
  .get('/patterns', async (c) => {
    const projectId = c.req.query('projectId');
    if (!projectId) {
      return c.json({ error: 'Missing projectId query parameter' }, 400);
    }

    const patterns = await prisma.historicalPattern.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' }
    });

    return c.json({ patterns });
  })

  /**
   * GET /api/historical/regressions
   * Returns usability regressions.
   */
  .get('/regressions', async (c) => {
    const projectId = c.req.query('projectId');
    if (!projectId) {
      return c.json({ error: 'Missing projectId query parameter' }, 400);
    }

    const regressions = await prisma.workflowRegression.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });

    return c.json({ regressions });
  })

  /**
   * GET /api/historical/personas
   * Returns behavioral metrics and trends per persona.
   */
  .get('/personas', async (c) => {
    const projectId = c.req.query('projectId');
    if (!projectId) {
      return c.json({ error: 'Missing projectId query parameter' }, 400);
    }

    const trends = await prisma.personaTrend.findMany({
      where: { projectId },
      orderBy: { personaType: 'asc' }
    });

    return c.json({ trends });
  })

  /**
   * GET /api/historical/trends
   * Returns stability scores and heatmap points.
   */
  .get('/trends', async (c) => {
    const projectId = c.req.query('projectId');
    if (!projectId) {
      return c.json({ error: 'Missing projectId query parameter' }, 400);
    }

    const insight = await prisma.organizationalInsight.findFirst({
      where: { projectId, insightCategory: 'STABILITY' },
      orderBy: { createdAt: 'desc' }
    });

    if (!insight) {
      return c.json({ stabilityTrend: [], heatmapPoints: [], averageStability: 100 });
    }

    const metrics = (insight.metrics as any) || {};
    return c.json({
      stabilityTrend: metrics.stabilityTrend || [],
      heatmapPoints: metrics.heatmapPoints || [],
      averageStability: Math.round(insight.impactScore * 100)
    });
  })

  /**
   * GET /api/historical/insights
   * Returns longitudinal organizational insights.
   */
  .get('/insights', async (c) => {
    const projectId = c.req.query('projectId');
    if (!projectId) {
      return c.json({ error: 'Missing projectId query parameter' }, 400);
    }

    const insights = await prisma.organizationalInsight.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });

    return c.json({ insights });
  })

  /**
   * GET /api/historical/correlations
   * Returns clustered finding correlations across sessions.
   */
  .get('/correlations', async (c) => {
    const projectId = c.req.query('projectId');
    if (!projectId) {
      return c.json({ error: 'Missing projectId query parameter' }, 400);
    }

    const correlations = await prisma.historicalCorrelation.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });

    return c.json({ correlations });
  })

  /**
   * GET /api/historical/adaptive-signals
   * Returns active adaptive orchestration prioritized profiles.
   */
  .get('/adaptive-signals', async (c) => {
    const projectId = c.req.query('projectId');
    if (!projectId) {
      return c.json({ error: 'Missing projectId query parameter' }, 400);
    }

    const profiles = await prisma.adaptiveSignalProfile.findMany({
      where: { projectId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    return c.json({ profiles });
  })

  /**
   * POST /api/historical/analyze/:projectId
   * Manually triggers the historical pipeline execution over past runs.
   */
  .post('/analyze/:projectId', async (c) => {
    const projectId = c.req.param('projectId');
    const body = await c.req.json().catch(() => ({}));
    
    // Find the latest workflow session ID to compare against if not provided
    let latestSessionId = body.latestSessionId;
    if (!latestSessionId) {
      const latest = await prisma.workflowSession.findFirst({
        where: { projectId },
        orderBy: { createdAt: 'desc' }
      });
      latestSessionId = latest?.id;
    }

    if (!latestSessionId) {
      return c.json({ error: 'No sessions found in this project to analyze.' }, 400);
    }

    try {
      const pipeline = new HistoricalIntelligencePipeline(prisma);
      const result = await pipeline.runPipeline(projectId, latestSessionId, body.customBaselineId);
      return c.json({ success: true, result });
    } catch (err: any) {
      return c.json({ error: err.message || 'Failed to trigger historical learning pipeline' }, 500);
    }
  });
