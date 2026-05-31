import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import {
  InitiativeManager,
  RoadmapGenerator,
  StrategicPrioritizer,
  ExecutiveDashboardEngine,
  StrategyTimelineManager,
  PortfolioManager,
  CapacityPlanner
} from '@fricta/product-strategy';
import { RBACAuthorizationGuard } from '@fricta/rbac-core';

export const strategyRoutes = new Hono();
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
 * GET /api/strategy/objectives
 * List strategic objectives for a project.
 */
strategyRoutes.get('/objectives', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const wId = await resolveWorkspace(projectId, workspaceId);

  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const objectives = await prisma.strategicObjective.findMany({
    where: { projectId },
    include: { initiatives: true },
    orderBy: { createdAt: 'desc' }
  });

  return c.json({ objectives });
});

/**
 * POST /api/strategy/objectives
 * Create a new strategic objective.
 */
strategyRoutes.post('/objectives', async (c) => {
  const user = await resolveUser(c);
  const { projectId, workspaceId, title, description, targetMetric, targetValue } = await c.req.json().catch(() => ({}));

  if (!projectId || !title || !description) {
    return c.json({ error: 'projectId, title, and description are required' }, 400);
  }

  const wId = await resolveWorkspace(projectId, workspaceId);
  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const obj = await InitiativeManager.createStrategicObjective(projectId, {
    title,
    description,
    targetMetric,
    targetValue
  });

  return c.json(obj, 201);
});

/**
 * GET /api/strategy/initiatives
 * List initiatives with their evidence, risks, and objectives.
 */
strategyRoutes.get('/initiatives', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const wId = await resolveWorkspace(projectId, workspaceId);

  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const initiatives = await prisma.productInitiative.findMany({
    where: { projectId },
    include: {
      objective: true,
      evidence: true,
      risks: true
    },
    orderBy: { strategicScore: 'desc' }
  });

  return c.json({ initiatives });
});

/**
 * POST /api/strategy/initiatives
 * Create a new strategic initiative and link evidence/risks.
 */
strategyRoutes.post('/initiatives', async (c) => {
  const user = await resolveUser(c);
  const body = await c.req.json().catch(() => ({}));
  const {
    projectId,
    workspaceId,
    objectiveId,
    title,
    description,
    owner,
    complexity,
    effortScore,
    targetQuarter,
    evidenceList,
    riskList
  } = body;

  if (!projectId || !title || !description) {
    return c.json({ error: 'projectId, title, and description are required' }, 400);
  }

  const wId = await resolveWorkspace(projectId, workspaceId);
  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  // 1. Create base initiative
  const init = await InitiativeManager.createProductInitiative(projectId, {
    objectiveId,
    title,
    description,
    owner,
    complexity,
    effortScore: effortScore ? parseFloat(effortScore) : undefined,
    targetQuarter
  });

  // 2. Link evidence list
  if (evidenceList && Array.isArray(evidenceList)) {
    for (const ev of evidenceList) {
      await InitiativeManager.addEvidence(init.id, {
        evidenceType: ev.evidenceType,
        referenceId: ev.referenceId,
        description: ev.description,
        metadata: ev.metadata
      });
    }
  }

  // 3. Link risks list
  if (riskList && Array.isArray(riskList)) {
    for (const r of riskList) {
      await InitiativeManager.createStrategicRisk(init.id, {
        riskType: r.riskType,
        description: r.description,
        severity: r.severity,
        mitigationPlan: r.mitigationPlan
      });
    }
  }

  // 4. Calculate dynamic priorities
  const fullEvidence = await prisma.initiativeEvidence.findMany({ where: { initiativeId: init.id } });
  const priorityInfo = StrategicPrioritizer.calculateInitiativePriority({
    complexity: init.complexity,
    effortScore: init.effortScore,
    objectiveId: init.objectiveId
  }, fullEvidence);

  const updatedInit = await prisma.productInitiative.update({
    where: { id: init.id },
    data: {
      strategicScore: priorityInfo.overallScore,
      userImpactScore: priorityInfo.userImpact,
      survivabilityScore: priorityInfo.survivabilityScore,
      riskScore: priorityInfo.confidence
    },
    include: {
      objective: true,
      evidence: true,
      risks: true
    }
  });

  return c.json(updatedInit, 201);
});

/**
 * POST /api/strategy/initiatives/:id/decide
 * Transition initiative status or details (owner, quarter, complexity).
 */
strategyRoutes.post('/initiatives/:id/decide', async (c) => {
  const user = await resolveUser(c);
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const { workspaceId, status, owner, targetQuarter, complexity, effortScore } = body;

  const init = await prisma.productInitiative.findUnique({ where: { id } });
  if (!init) return c.json({ error: 'Initiative not found' }, 404);

  const wId = await resolveWorkspace(init.projectId, workspaceId);
  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const updated = await InitiativeManager.updateInitiativeStatus(id, status || init.status, {
    owner,
    targetQuarter,
    complexity,
    effortScore: effortScore ? parseFloat(effortScore) : undefined
  });

  // Re-calculate scores
  const fullEvidence = await prisma.initiativeEvidence.findMany({ where: { initiativeId: id } });
  const priorityInfo = StrategicPrioritizer.calculateInitiativePriority({
    complexity: updated.complexity,
    effortScore: updated.effortScore,
    objectiveId: updated.objectiveId
  }, fullEvidence);

  const finalUpdated = await prisma.productInitiative.update({
    where: { id },
    data: {
      strategicScore: priorityInfo.overallScore,
      userImpactScore: priorityInfo.userImpact,
      survivabilityScore: priorityInfo.survivabilityScore,
      riskScore: priorityInfo.confidence
    },
    include: { objective: true, evidence: true, risks: true }
  });

  return c.json(finalUpdated);
});

/**
 * GET /api/strategy/roadmaps
 * List roadmaps.
 */
strategyRoutes.get('/roadmaps', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const wId = await resolveWorkspace(projectId, workspaceId);

  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const roadmaps = await prisma.productRoadmap.findMany({
    where: { projectId },
    include: {
      initiatives: {
        include: { objective: true, evidence: true, risks: true }
      }
    },
    orderBy: { quarter: 'asc' }
  });

  return c.json({ roadmaps });
});

/**
 * POST /api/strategy/roadmaps/generate
 * Sequence initiatives and trigger roadmap recommendation generation.
 */
strategyRoutes.post('/roadmaps/generate', async (c) => {
  const user = await resolveUser(c);
  const { projectId, workspaceId } = await c.req.json().catch(() => ({}));

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const wId = await resolveWorkspace(projectId, workspaceId);

  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const roadmaps = await RoadmapGenerator.generateRoadmapProposal(projectId);
  return c.json({ roadmaps });
});

/**
 * GET /api/strategy/priorities
 * Fetch priorities and evaluate opportunities.
 */
strategyRoutes.get('/priorities', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const wId = await resolveWorkspace(projectId, workspaceId);

  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const scores = await StrategicPrioritizer.evaluateProjectPriorities(projectId);
  return c.json({ priorities: scores });
});

/**
 * GET /api/strategy/executive
 * Fetch executive metrics and health snapshots.
 */
strategyRoutes.get('/executive', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const wId = await resolveWorkspace(projectId, workspaceId);

  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const result = await ExecutiveDashboardEngine.compileSnapshot(projectId);
  const snapshots = await prisma.productHealthSnapshot.findMany({
    where: { projectId },
    orderBy: { recordedAt: 'desc' },
    take: 12
  });

  return c.json({
    metrics: result,
    snapshots
  });
});

/**
 * GET /api/strategy/health
 * Consolidated health pipeline metrics.
 */
strategyRoutes.get('/health', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const wId = await resolveWorkspace(projectId, workspaceId);

  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const breakdown = await PortfolioManager.getPortfolioBreakdown(projectId);
  const timeline = await StrategyTimelineManager.getStrategyTimeline(projectId);
  const planner = await CapacityPlanner.recommendSequencing(projectId);

  return c.json({
    portfolio: breakdown,
    timeline,
    capacityPlanner: planner
  });
});
