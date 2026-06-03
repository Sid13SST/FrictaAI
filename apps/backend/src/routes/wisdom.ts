import { resolveUser } from '../middleware';
import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import {
  WisdomEngine,
  LessonSynthesizer,
  PrincipleDiscoverer,
  WisdomEvidenceResolver,
  HistoricalCaseSynthesizer,
  PersonaWisdomLearner,
  GovernanceWisdomAuditor
} from '@fricta/institutional-intelligence';
import { RBACAuthorizationGuard } from '@fricta/rbac-core';
import { RealtimeEventBus } from '@fricta/realtime';

export const wisdomRoutes = new Hono();
const guard = new RBACAuthorizationGuard(prisma);

const WISDOM_DISCLAIMER = {
  message: "Institutional wisdom records are advisory only. They represent synthesized historical recurrence, trend analysis, and evidence-backed principles. They do not constitute automated decisions, governance actions, or mandatory directives."
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
    // Check Workspace Membership, Project Access, and ANALYTICS Domain Permissions
    const isProjectInScope = await guard.checkProjectScope(wId, projectId);
    if (!isProjectInScope) return false;

    return guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
  }
  return true;
}

async function authorizeWrite(c: any, projectId: string, user: any): Promise<boolean> {
  const wId = await resolveWorkspace(projectId);
  if (wId) {
    const isProjectInScope = await guard.checkProjectScope(wId, projectId);
    if (!isProjectInScope) return false;

    return guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'WRITE');
  }
  return true;
}

/**
 * GET /api/wisdom/lessons
 */
wisdomRoutes.get('/lessons', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const hasPerm = await authorizeRead(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const lessons = await prisma.institutionalLesson.findMany({
    where: { projectId },
    include: { evidences: true },
    orderBy: { impactScore: 'desc' }
  });

  return c.json({ lessons, disclaimer: WISDOM_DISCLAIMER });
});

/**
 * GET /api/wisdom/principles
 */
wisdomRoutes.get('/principles', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const hasPerm = await authorizeRead(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const principles = await prisma.organizationalPrinciple.findMany({
    where: { projectId },
    orderBy: { supportRate: 'desc' }
  });

  return c.json({ principles, disclaimer: WISDOM_DISCLAIMER });
});

/**
 * GET /api/wisdom/history
 */
wisdomRoutes.get('/history', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const hasPerm = await authorizeRead(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const syntheses = await prisma.historicalSynthesis.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' }
  });

  const casesStats = await HistoricalCaseSynthesizer.compileHistoricalStats(projectId);

  return c.json({ syntheses, casesStats, disclaimer: WISDOM_DISCLAIMER });
});

/**
 * GET /api/wisdom/evidence
 */
wisdomRoutes.get('/evidence', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const lessonId = c.req.query('lessonId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  if (!lessonId) return c.json({ error: 'lessonId is required' }, 400);

  const hasPerm = await authorizeRead(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const evidence = await WisdomEvidenceResolver.resolveEvidenceForLesson(projectId, lessonId);
  return c.json({ evidence });
});

/**
 * GET /api/wisdom/trends
 */
wisdomRoutes.get('/trends', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const hasPerm = await authorizeRead(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const trends = await prisma.longTermTrend.findMany({
    where: { projectId },
    orderBy: { changePercent: 'desc' }
  });

  return c.json({ trends, disclaimer: WISDOM_DISCLAIMER });
});

/**
 * GET /api/wisdom/synthesis
 */
wisdomRoutes.get('/synthesis', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const hasPerm = await authorizeRead(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const learnings = await prisma.strategicLearning.findMany({
    where: { projectId },
    orderBy: { impactRating: 'desc' }
  });

  const personas = await PersonaWisdomLearner.compilePersonaWisdom(projectId);
  const governanceAudit = await GovernanceWisdomAuditor.auditGovernanceWisdom(projectId);

  const records = await prisma.wisdomRecord.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' }
  });

  return c.json({
    learnings,
    personas,
    governanceAudit,
    records,
    disclaimer: WISDOM_DISCLAIMER
  });
});

/**
 * POST /api/wisdom/evaluate
 */
wisdomRoutes.post('/evaluate', async (c) => {
  const user = await resolveUser(c);
  const body = await c.req.json().catch(() => ({}));
  const { projectId } = body;
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const hasPerm = await authorizeWrite(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const cycleResult = await WisdomEngine.runWisdomCycle(projectId);

  // Broadcast realtime SSE updates
  const wId = await resolveWorkspace(projectId);
  if (wId) {
    const bus = RealtimeEventBus.getInstance();
    
    // Broadcast synthesis complete
    bus.publish({
      orchestrationSessionId: wId,
      eventType: 'wisdom.synthesis.completed',
      payload: { projectId, snapshotId: cycleResult.snapshotId }
    });

    // Broadcast new principles discovered
    bus.publish({
      orchestrationSessionId: wId,
      eventType: 'wisdom.principles.updated',
      payload: { projectId }
    });

    // Broadcast new lessons synthesized
    bus.publish({
      orchestrationSessionId: wId,
      eventType: 'wisdom.lessons.updated',
      payload: { projectId }
    });

    // Broadcast trends updated
    bus.publish({
      orchestrationSessionId: wId,
      eventType: 'wisdom.trends.updated',
      payload: { projectId }
    });
  }

  return c.json(cycleResult);
});
