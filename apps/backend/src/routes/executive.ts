import { resolveUser } from '../middleware';
import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import {
  BriefingManager,
  DecisionManager,
  HealthSummaryEngine,
  GovernanceAuditor,
  StrategicRiskCenter,
  OversightTimeline,
  EvidenceResolver
} from '@fricta/executive-intelligence';
import { RBACAuthorizationGuard } from '@fricta/rbac-core';

export const executiveRoutes = new Hono();
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
 * GET /api/executive/recommendations
 * Lists active strategic recommendations.
 */
executiveRoutes.get('/recommendations', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const wId = await resolveWorkspace(projectId, workspaceId);

  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  // Auto-generate fresh active recommendations
  await BriefingManager.generateRecommendations(projectId).catch(() => {});

  const recommendations = await prisma.executiveRecommendation.findMany({
    where: { projectId },
    include: {
      evidence: true,
      decisions: {
        include: { user: true }
      }
    },
    orderBy: { priority: 'asc' }
  });

  return c.json({ recommendations });
});

/**
 * POST /api/executive/recommendations/:id/decide
 * Applies user decision on a strategic recommendation.
 */
executiveRoutes.post('/recommendations/:id/decide', async (c) => {
  const user = await resolveUser(c);
  const recId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const { projectId, workspaceId, action, notes } = body;

  if (!projectId || !action) {
    return c.json({ error: 'projectId and action are required' }, 400);
  }

  const wId = await resolveWorkspace(projectId, workspaceId);
  if (wId) {
    // Requires ANALYTICS WRITE or governance override permission
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const decision = await DecisionManager.recordDecision(
    projectId,
    recId,
    user?.id || 'demo_user',
    action,
    notes
  );

  return c.json({ decision });
});

/**
 * GET /api/executive/health
 * Returns executive briefings and health summaries.
 */
executiveRoutes.get('/health', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const wId = await resolveWorkspace(projectId, workspaceId);

  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  // Compute a fresh health snapshot
  await HealthSummaryEngine.calculateExecutiveHealth(projectId).catch(() => {});

  const briefing = await BriefingManager.generateBriefings(projectId);
  const history = await HealthSummaryEngine.getExecutiveHealthHistory(projectId);

  return c.json({
    briefing,
    health: history
  });
});

/**
 * GET /api/executive/governance
 * Runs workspace policy compliance and individual initiative compliance checks.
 */
executiveRoutes.get('/governance', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const wId = await resolveWorkspace(projectId, workspaceId);

  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  // Execute policy checks
  const policyReviews = await GovernanceAuditor.auditWorkspacePolicies(projectId);

  // Execute compliance audit on active initiatives
  const initiatives = await prisma.productInitiative.findMany({ where: { projectId } });
  for (const init of initiatives) {
    await GovernanceAuditor.auditInitiativeCompliance(projectId, init.id).catch(() => {});
  }

  const policyReviewsSaved = await prisma.governancePolicyReview.findMany({
    where: { projectId },
    orderBy: { checkedAt: 'desc' }
  });

  const initiativeComplianceReviews = await prisma.governanceReview.findMany({
    where: { projectId },
    orderBy: { reviewedAt: 'desc' }
  });

  return c.json({
    policyReviews: policyReviewsSaved,
    initiativeReviews: initiativeComplianceReviews
  });
});

/**
 * GET /api/executive/risks
 * Retrieves strategic risk dashboard records.
 */
executiveRoutes.get('/risks', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const wId = await resolveWorkspace(projectId, workspaceId);

  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  // Calculate high-level risks
  const risks = await StrategicRiskCenter.calculateOrganizationalRisks(projectId);

  return c.json({ risks });
});

/**
 * GET /api/executive/decisions
 * Compiles chronological decision timelines and audit logs.
 */
executiveRoutes.get('/decisions', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const wId = await resolveWorkspace(projectId, workspaceId);

  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  // Refresh outcome tracking
  await DecisionManager.measureDecisionOutcomes(projectId).catch(() => {});

  const timeline = await OversightTimeline.getOversightTimelineEvents(projectId);
  const outcomes = await prisma.decisionOutcome.findMany({
    where: { decision: { recommendation: { projectId } } },
    include: { decision: { include: { recommendation: true } } }
  });

  return c.json({
    timeline,
    outcomes
  });
});

/**
 * GET /api/executive/evidence/:id
 * Resolves detailed recommendation evidence paths.
 */
executiveRoutes.get('/evidence/:id', async (c) => {
  const user = await resolveUser(c);
  const recId = c.req.param('id');
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const wId = await resolveWorkspace(projectId, workspaceId);

  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const evidenceTrail = await EvidenceResolver.resolveEvidenceTrail(projectId, recId);

  return c.json({ evidence: evidenceTrail });
});
