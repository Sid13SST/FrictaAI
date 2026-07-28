import { resolveUser } from '../middleware';
import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import {
  LearningEngine,
  EvidenceResolver,
  PersonaBehaviorLearner,
  OutcomePatternAnalyzer,
  LearningTimelineExplorer
} from '@fricta/organizational-learning';
import { RBACAuthorizationGuard } from '@fricta/rbac-core';
import { verifyProjectOwnership } from '../guards/ownership';

export const learningRoutes = new Hono();
const guard = new RBACAuthorizationGuard(prisma);



async function resolveWorkspace(projectId: string | null | undefined): Promise<string | null> {
  if (projectId) {
    const proj = await prisma.project.findUnique({ where: { id: projectId } });
    if (proj) return proj.workspaceId;
  }
  return null;
}

// Project ownership is the non-bypassable baseline (also covers solo/standalone
// projects with no workspace); workspace permission is an additional layer on top.
async function authorizeRead(c: any, projectId: string, user: any): Promise<boolean> {
  const ownership = await verifyProjectOwnership(user?.id || '', projectId);
  if (ownership !== 'OWNED') return false;

  const wId = await resolveWorkspace(projectId);
  if (wId) {
    return guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
  }
  return true;
}

async function authorizeWrite(c: any, projectId: string, user: any): Promise<boolean> {
  const ownership = await verifyProjectOwnership(user?.id || '', projectId);
  if (ownership !== 'OWNED') return false;

  const wId = await resolveWorkspace(projectId);
  if (wId) {
    return guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'WRITE');
  }
  return true;
}

/**
 * GET /api/learning/patterns
 */
learningRoutes.get('/patterns', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const hasPerm = await authorizeRead(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const patterns = await prisma.learningPattern.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' }
  });
  return c.json({ patterns });
});

/**
 * GET /api/learning/success
 */
learningRoutes.get('/success', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const hasPerm = await authorizeRead(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const successes = await prisma.successPattern.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' }
  });
  return c.json({ successes });
});

/**
 * GET /api/learning/failures
 */
learningRoutes.get('/failures', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const hasPerm = await authorizeRead(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const failures = await prisma.failurePattern.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' }
  });
  return c.json({ failures });
});

/**
 * GET /api/learning/history
 */
learningRoutes.get('/history', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const title = c.req.query('title') || '';
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const hasPerm = await authorizeRead(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const matches = await LearningEngine.getSimilarCases(projectId, title);
  const outcomes = await OutcomePatternAnalyzer.analyzeOutcomePatterns(projectId);
  const lessons = await prisma.organizationalLesson.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return c.json({
    matches,
    outcomes,
    lessons
  });
});

/**
 * GET /api/learning/evidence/:id
 */
learningRoutes.get('/evidence/:id', async (c) => {
  const user = await resolveUser(c);
  const patternId = c.req.param('id');
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const hasPerm = await authorizeRead(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const evidence = await EvidenceResolver.resolveEvidenceForPattern(projectId, patternId);
  return c.json({ evidence });
});

/**
 * GET /api/learning/personas
 */
learningRoutes.get('/personas', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const hasPerm = await authorizeRead(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const list = await PersonaBehaviorLearner.learnPersonaBehaviors(projectId);
  const timeline = await LearningTimelineExplorer.getLearningTimeline(projectId);

  return c.json({
    personas: list,
    timeline
  });
});

/**
 * POST /api/learning/scan
 */
learningRoutes.post('/scan', async (c) => {
  const user = await resolveUser(c);
  const body = await c.req.json().catch(() => ({}));
  const { projectId } = body;
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const hasPerm = await authorizeWrite(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const cycleResult = await LearningEngine.runLearningCycle(projectId);

  return c.json(cycleResult);
});
