import { resolveUser } from '../middleware';
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
import { verifyProjectOwnership } from '../guards/ownership';

export const intelligenceRoutes = new Hono();
const guard = new RBACAuthorizationGuard(prisma);

// Project ownership is the non-bypassable baseline (also covers solo/standalone
// projects with no workspace); workspace permission (checked inline below where
// a workspaceId is supplied) is an additional layer on top.
async function authorizeProject(projectId: string, userId: string): Promise<'OK' | 'NOT_FOUND' | 'FORBIDDEN'> {
  const ownership = await verifyProjectOwnership(userId, projectId);
  if (ownership === 'NOT_FOUND') return 'NOT_FOUND';
  if (ownership !== 'OWNED') return 'FORBIDDEN';
  return 'OK';
}



/**
 * POST /api/intelligence/synthesis
 * Triggers a manual cross-session synthesis execution pipeline.
 */
intelligenceRoutes.post('/synthesis', async (c) => {
  const user = await resolveUser(c);
  const { projectId, workspaceId } = await c.req.json().catch(() => ({}));

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const projectAuth = await authorizeProject(projectId, user?.id || '');
  if (projectAuth === 'NOT_FOUND') return c.json({ error: 'Project not found' }, 404);
  if (projectAuth === 'FORBIDDEN') return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

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

  const projectAuth = await authorizeProject(projectId, user?.id || '');
  if (projectAuth === 'NOT_FOUND') return c.json({ error: 'Project not found' }, 404);
  if (projectAuth === 'FORBIDDEN') return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

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

  // This route has no projectId to scope by, so workspaceId is the only
  // available boundary — it must be required, not optional.
  if (!workspaceId) return c.json({ error: 'workspaceId is required' }, 400);

  const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'READ');
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const trends = await LongitudinalTrendAnalyzer.getHistoricalTrends(workspaceId);
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

  const projectAuth = await authorizeProject(projectId, user?.id || '');
  if (projectAuth === 'NOT_FOUND') return c.json({ error: 'Project not found' }, 404);
  if (projectAuth === 'FORBIDDEN') return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

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

  const projectAuth = await authorizeProject(projectId, user?.id || '');
  if (projectAuth === 'NOT_FOUND') return c.json({ error: 'Project not found' }, 404);
  if (projectAuth === 'FORBIDDEN') return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

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

  const projectAuth = await authorizeProject(projectId, user?.id || '');
  if (projectAuth === 'NOT_FOUND') return c.json({ error: 'Project not found' }, 404);
  if (projectAuth === 'FORBIDDEN') return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

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

  const projectAuth = await authorizeProject(projectId, user?.id || '');
  if (projectAuth === 'NOT_FOUND') return c.json({ error: 'Project not found' }, 404);
  if (projectAuth === 'FORBIDDEN') return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

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

  const projectAuth = await authorizeProject(projectId, user?.id || '');
  if (projectAuth === 'NOT_FOUND') return c.json({ error: 'Project not found' }, 404);
  if (projectAuth === 'FORBIDDEN') return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

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
