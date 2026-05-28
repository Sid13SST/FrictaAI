import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import {
  CrossSessionSynthesizer,
  PersistentPatternDetector,
  UsabilityRegressionAnalyzer,
  PersonaEvolutionTracker,
  LongitudinalTrendAnalyzer,
  UXMemoryEngine,
  WorkflowSurvivabilityTracker
} from '@fricta/cross-session-intelligence';
import { RBACAuthorizationGuard } from '@fricta/rbac-core';

export const intelligenceRoutes = new Hono();
const guard = new RBACAuthorizationGuard(prisma);

// User Resolver Helper
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

/**
 * POST /api/intelligence/synthesis
 * Triggers a manual cross-session synthesis execution pipeline.
 */
intelligenceRoutes.post('/synthesis', async (c) => {
  const user = await resolveUser(c);
  const { projectId, workspaceId } = await c.req.json().catch(() => ({}));

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const results = await CrossSessionSynthesizer.runSynthesisPipeline(projectId, workspaceId || null);
  return c.json({ results });
});

/**
 * GET /api/intelligence/cross-session
 * Returns recurrent user interaction friction patterns.
 */
intelligenceRoutes.get('/cross-session', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const patterns = await PersistentPatternDetector.getCrossSessionPatterns(projectId, workspaceId || null);
  return c.json({ patterns });
});

/**
 * GET /api/intelligence/trends
 * Returns stability, complexity, and risk evolution trends.
 */
intelligenceRoutes.get('/trends', async (c) => {
  const user = await resolveUser(c);
  const workspaceId = c.req.query('workspaceId');

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const trends = await LongitudinalTrendAnalyzer.getHistoricalTrends(workspaceId || null);
  return c.json({ trends });
});

/**
 * GET /api/intelligence/regressions
 * Returns version-to-version regression and drift metrics.
 */
intelligenceRoutes.get('/regressions', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const regressions = await UsabilityRegressionAnalyzer.getRegressions(projectId, workspaceId || null);
  return c.json({ regressions });
});

/**
 * GET /api/intelligence/personas
 * Returns longitudinal user archetype adaptation rates and fatigue indices.
 */
intelligenceRoutes.get('/personas', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const personas = await PersonaEvolutionTracker.getPersonaEvolutions(projectId, workspaceId || null);
  return c.json({ personas });
});

/**
 * GET /api/intelligence/history
 * Returns chronological usability memory snapshots.
 */
intelligenceRoutes.get('/history', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const snapshots = await UXMemoryEngine.getMemorySnapshots(projectId, workspaceId || null);
  return c.json({ snapshots });
});

/**
 * GET /api/intelligence/survivability
 * Projects survivability trends from historical forecasting runs.
 */
intelligenceRoutes.get('/survivability', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const survivability = await WorkflowSurvivabilityTracker.projectSurvivability(projectId, workspaceId || null);
  return c.json({ survivability });
});

/**
 * GET /api/intelligence/memory
 * Returns raw memory snapshots.
 */
intelligenceRoutes.get('/memory', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const snapshots = await prisma.uXMemorySnapshot.findMany({
    where: { projectId, workspaceId: workspaceId || null },
    orderBy: { capturedAt: 'desc' }
  });

  return c.json({ snapshots });
});
