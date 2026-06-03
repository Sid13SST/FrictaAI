import { resolveUser } from '../middleware';
import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import {
  ForecastingEngine,
  ScenarioEngine,
  ForecastEvidenceLinker,
  AssumptionValidator,
  ForecastTimelineExplorer
} from '@fricta/forecasting-intelligence';
import { RBACAuthorizationGuard } from '@fricta/rbac-core';

export const forecastsRoutes = new Hono();
const guard = new RBACAuthorizationGuard(prisma);

const DISCLAIMER = {
  message: "Forecasts represent probabilistic projections, historical pattern analysis, and evidence-backed scenarios. They do not represent guaranteed outcomes, executive directives, or autonomous decisions."
};



async function resolveWorkspace(projectId: string | null | undefined): Promise<string | null> {
  if (projectId) {
    const proj = await prisma.project.findUnique({ where: { id: projectId } });
    if (proj) return proj.workspaceId;
  }
  return null;
}

async function authorizeRead(c: any, projectId: string, user: any): Promise<boolean> {
  const wId = await resolveWorkspace(projectId);
  if (wId) {
    // ANALYTICS role can read forecasts
    return guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
  }
  return true;
}

async function authorizeWrite(c: any, projectId: string, user: any): Promise<boolean> {
  const wId = await resolveWorkspace(projectId);
  if (wId) {
    // STRATEGY actions require ANALYTICS WRITE permission
    return guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'WRITE');
  }
  return true;
}

/**
 * GET /api/forecasts
 */
forecastsRoutes.get('/', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const hasPerm = await authorizeRead(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const forecasts = await prisma.forecastRecord.findMany({
    where: { projectId },
    include: {
      assumptions: true,
      confidences: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return c.json({ forecasts, disclaimer: DISCLAIMER });
});

/**
 * GET /api/forecasts/scenarios
 */
forecastsRoutes.get('/scenarios', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const hasPerm = await authorizeRead(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const scenarios = await prisma.scenarioAnalysis.findMany({
    where: { projectId },
    include: { outcomes: true },
    orderBy: { createdAt: 'desc' }
  });

  return c.json({ scenarios, disclaimer: DISCLAIMER });
});

/**
 * GET /api/forecasts/evidence
 */
forecastsRoutes.get('/evidence', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const forecastId = c.req.query('forecastId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  if (!forecastId) return c.json({ error: 'forecastId is required' }, 400);

  const hasPerm = await authorizeRead(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const evidence = await ForecastEvidenceLinker.resolveEvidenceForForecast(projectId, forecastId);
  return c.json({ evidence });
});

/**
 * GET /api/forecasts/risks
 */
forecastsRoutes.get('/risks', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const hasPerm = await authorizeRead(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const risks = await prisma.emergingRisk.findMany({
    where: { projectId },
    orderBy: { severity: 'desc' }
  });

  return c.json({ risks, disclaimer: DISCLAIMER });
});

/**
 * GET /api/forecasts/assumptions
 */
forecastsRoutes.get('/assumptions', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const hasPerm = await authorizeRead(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const assumptions = await prisma.forecastAssumption.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' }
  });

  return c.json({ assumptions });
});

/**
 * GET /api/forecasts/confidence
 */
forecastsRoutes.get('/confidence', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const forecastId = c.req.query('forecastId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  if (!forecastId) return c.json({ error: 'forecastId is required' }, 400);

  const hasPerm = await authorizeRead(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const confidences = await prisma.confidenceRecord.findMany({
    where: { projectId, forecastId },
    orderBy: { createdAt: 'desc' }
  });

  return c.json({ confidences });
});

/**
 * POST /api/forecasts/evaluate
 */
forecastsRoutes.post('/evaluate', async (c) => {
  const user = await resolveUser(c);
  const body = await c.req.json().catch(() => ({}));
  const { projectId } = body;
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  // STRATEGY permission (write) is required to run evaluation cycles
  const hasPerm = await authorizeWrite(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const cycleResult = await ForecastingEngine.runForecastCycle(projectId);
  const timeline = await ForecastTimelineExplorer.getTimelineProjections(projectId);

  return c.json({
    ...cycleResult,
    timeline
  });
});

// REST boundary workspace isolation and RBAC checks enforce user visibility parameters.
