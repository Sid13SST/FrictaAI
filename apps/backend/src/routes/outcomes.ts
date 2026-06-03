import { resolveUser } from '../middleware';
import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import {
  KPIManager,
  OutcomeEvaluator,
  InitiativeLinker,
  MetricExtractor,
  ExecutiveHealthEngine,
  HealthSummaryEngine,
  OutcomeForecaster,
  UXCorrelationAnalyzer,
  OutcomeTimelineLogger
} from '@fricta/outcome-intelligence';
import { RBACAuthorizationGuard } from '@fricta/rbac-core';

export const outcomesRoutes = new Hono();
const guard = new RBACAuthorizationGuard(prisma);



// Workspace Resolver Helper
async function resolveWorkspace(projectId: string | null | undefined, workspaceId: string | null | undefined): Promise<string | null> {
  if (workspaceId) return workspaceId;
  if (projectId) {
    const proj = await prisma.project.findUnique({ where: { id: projectId } });
    if (proj) return proj.workspaceId;
  }
  return null;
}

/**
 * GET /api/outcomes/kpis
 * Lists KPIs with their histories, forecasts, and baselines.
 */
outcomesRoutes.get('/kpis', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const wId = await resolveWorkspace(projectId, workspaceId);

  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  // Trigger metrics sync before listing to ensure active values are fresh
  await MetricExtractor.syncKPIsFromTelemetry(projectId).catch(() => {});

  const kpis = await KPIManager.getKPIs(projectId);
  return c.json({ kpis });
});

/**
 * POST /api/outcomes/kpis
 * Define a new KPI.
 */
outcomesRoutes.post('/kpis', async (c) => {
  const user = await resolveUser(c);
  const body = await c.req.json().catch(() => ({}));
  const { projectId, workspaceId, name, description, kpiType, metricKey, targetValue, owner } = body;

  if (!projectId || !name || !description || !kpiType || !metricKey) {
    return c.json({ error: 'projectId, name, description, kpiType, and metricKey are required' }, 400);
  }

  const wId = await resolveWorkspace(projectId, workspaceId);
  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const kpi = await KPIManager.createKPI(projectId, {
    name,
    description,
    kpiType,
    metricKey,
    targetValue: targetValue ? parseFloat(targetValue) : undefined,
    owner
  });

  return c.json(kpi, 201);
});

/**
 * GET /api/outcomes/health
 * Consolidated executive health scorecards.
 */
outcomesRoutes.get('/health', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const wId = await resolveWorkspace(projectId, workspaceId);

  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  // Compile latest scores
  const scoreCard = await ExecutiveHealthEngine.compileHealthScores(projectId).catch(() => null);
  const consolidated = await HealthSummaryEngine.getConsolidatedHealth(projectId);

  return c.json({
    latest: scoreCard,
    history: consolidated.history,
    averages: consolidated.averages
  });
});

/**
 * GET /api/outcomes/initiatives
 * Initiative impact linkages.
 */
outcomesRoutes.get('/initiatives', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const wId = await resolveWorkspace(projectId, workspaceId);

  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const impacts = await InitiativeLinker.getInitiativeImpacts(projectId);
  return c.json({ impacts });
});

/**
 * GET /api/outcomes/forecasts
 * KPI Forecasts.
 */
outcomesRoutes.get('/forecasts', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const wId = await resolveWorkspace(projectId, workspaceId);

  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const forecasts = await OutcomeForecaster.getForecasts(projectId);
  return c.json({ forecasts });
});

/**
 * POST /api/outcomes/forecasts
 * Create a new KPI Forecast.
 */
outcomesRoutes.post('/forecasts', async (c) => {
  const user = await resolveUser(c);
  const body = await c.req.json().catch(() => ({}));
  const { projectId, workspaceId, kpiId, projectedValue, confidenceLower, confidenceUpper, targetQuarter } = body;

  if (!kpiId || !projectedValue || !targetQuarter) {
    return c.json({ error: 'kpiId, projectedValue, and targetQuarter are required' }, 400);
  }

  const wId = await resolveWorkspace(projectId, workspaceId);
  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const forecast = await OutcomeForecaster.createForecast(
    kpiId,
    parseFloat(projectedValue),
    confidenceLower ? parseFloat(confidenceLower) : 0,
    confidenceUpper ? parseFloat(confidenceUpper) : 0,
    targetQuarter
  );

  return c.json(forecast, 201);
});

/**
 * GET /api/outcomes/trends
 * KPI histories and correlation coefficients.
 */
outcomesRoutes.get('/trends', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const wId = await resolveWorkspace(projectId, workspaceId);

  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const correlations = await UXCorrelationAnalyzer.calculateCorrelations(projectId);
  const timeline = await OutcomeTimelineLogger.getTimeline(projectId);

  return c.json({
    correlations,
    timeline
  });
});

/**
 * GET /api/outcomes/baselines
 * Pre-initiative baseline configurations.
 */
outcomesRoutes.get('/baselines', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const wId = await resolveWorkspace(projectId, workspaceId);

  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const baselines = await prisma.outcomeBaseline.findMany({
    where: { kpi: { projectId } },
    include: { kpi: true },
    orderBy: { createdAt: 'desc' }
  });

  return c.json({ baselines });
});

/**
 * POST /api/outcomes/baselines
 * Register a baseline for a KPI.
 */
outcomesRoutes.post('/baselines', async (c) => {
  const user = await resolveUser(c);
  const body = await c.req.json().catch(() => ({}));
  const { projectId, workspaceId, kpiId, value, windowStart, windowEnd } = body;

  if (!kpiId || value === undefined || !windowStart || !windowEnd) {
    return c.json({ error: 'kpiId, value, windowStart, and windowEnd are required' }, 400);
  }

  const wId = await resolveWorkspace(projectId, workspaceId);
  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const baseline = await KPIManager.recordBaseline(kpiId, {
    value: parseFloat(value),
    windowStart: new Date(windowStart),
    windowEnd: new Date(windowEnd)
  });

  return c.json(baseline, 201);
});

/**
 * POST /api/outcomes/evaluate
 * Triggers delta outcomes evaluation.
 */
outcomesRoutes.post('/evaluate', async (c) => {
  const user = await resolveUser(c);
  const body = await c.req.json().catch(() => ({}));
  const { projectId, workspaceId, initiativeId, title, description, evidenceList } = body;

  if (!projectId || !title || !description) {
    return c.json({ error: 'projectId, title, and description are required' }, 400);
  }

  const wId = await resolveWorkspace(projectId, workspaceId);
  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const evidence = evidenceList && Array.isArray(evidenceList) ? evidenceList : [];
  const outcome = await OutcomeEvaluator.evaluateInitiative(projectId, initiativeId || null, title, description, evidence);

  return c.json(outcome, 201);
});
