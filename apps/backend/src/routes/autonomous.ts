import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import {
  AutonomousOptimizationEngine,
  AdaptationProcessor,
  OptimizationSimulator,
  RollbackController,
  SynthesisEngine,
  RecommendationManager,
  RoadmapManager,
  TimelineManager
} from '@fricta/autonomous-optimization';
import { RealtimeEventBus } from '@fricta/realtime';
import { RBACAuthorizationGuard } from '@fricta/rbac-core';

export const autonomousRoutes = new Hono();
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
 * POST /api/autonomous/optimization/run
 * Create a new autonomous optimization proposal.
 */
autonomousRoutes.post('/optimization/run', async (c) => {
  const user = await resolveUser(c);
  const { projectId, workspaceId, workflowPath, remediationPlan, targetSelector, recommendationId } = await c.req.json().catch(() => ({}));

  if (!projectId || !workflowPath) {
    return c.json({ error: 'projectId and workflowPath are required' }, 400);
  }

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const run = await AutonomousOptimizationEngine.createProposalRun(
    projectId,
    workspaceId || null,
    workflowPath,
    remediationPlan,
    targetSelector,
    recommendationId
  );

  // Publish realtime event
  try {
    const bus = RealtimeEventBus.getInstance();
    bus.publish({
      id: `auto-run-${Date.now()}`,
      eventType: 'autonomous.proposal.created',
      orchestrationSessionId: '',
      payload: {
        projectId,
        workspaceId: workspaceId || null,
        runId: run.id,
        workflowPath,
        remediationPlan,
        overallSafetyScore: run.overallSafetyScore,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    // ignore
  }

  return c.json(run);
});

/**
 * GET /api/autonomous/optimization
 * Fetch all autonomous optimization runs.
 */
autonomousRoutes.get('/optimization', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const runs = await prisma.autonomousOptimizationRun.findMany({
    where: { projectId, workspaceId: workspaceId || null },
    include: {
      simulations: true,
      approvals: true,
      rollbacks: true,
      decisionTraces: true,
      safetySignals: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return c.json({ runs });
});

/**
 * POST /api/autonomous/simulation
 * Run sandbox simulations dynamically for a proposal.
 */
autonomousRoutes.post('/simulation', async (c) => {
  const { optimizationRunId, remediationPlan } = await c.req.json().catch(() => ({}));
  if (!optimizationRunId || !remediationPlan) {
    return c.json({ error: 'optimizationRunId and remediationPlan are required' }, 400);
  }

  const simulations = await OptimizationSimulator.runSandboxSimulation(optimizationRunId, remediationPlan);

  // Publish realtime event
  try {
    const bus = RealtimeEventBus.getInstance();
    bus.publish({
      id: `auto-sim-${Date.now()}`,
      eventType: 'autonomous.simulation.completed',
      orchestrationSessionId: '',
      payload: {
        optimizationRunId,
        simulationsCount: simulations.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    // ignore
  }

  return c.json({ simulations });
});

/**
 * POST /api/autonomous/approval
 * Human in the loop approval submissions.
 */
autonomousRoutes.post('/approval', async (c) => {
  const user = await resolveUser(c);
  const { optimizationRunId, roleScope, action, comments, workspaceId } = await c.req.json().catch(() => ({}));

  if (!optimizationRunId || !roleScope || !action) {
    return c.json({ error: 'optimizationRunId, roleScope, and action are required' }, 400);
  }

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const run = await AutonomousOptimizationEngine.submitReviewStatus(
    optimizationRunId,
    user?.id || null,
    roleScope,
    action,
    comments
  );

  // Publish realtime event
  try {
    const bus = RealtimeEventBus.getInstance();
    bus.publish({
      id: `auto-app-${Date.now()}`,
      eventType: 'autonomous.approval.updated',
      orchestrationSessionId: '',
      payload: {
        optimizationRunId,
        action,
        status: run.status,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    // ignore
  }

  return c.json(run);
});

/**
 * POST /api/autonomous/rollback
 * Revert states of optimization runs.
 */
autonomousRoutes.post('/rollback', async (c) => {
  const user = await resolveUser(c);
  const { optimizationRunId, rollbackReason, workspaceId } = await c.req.json().catch(() => ({}));

  if (!optimizationRunId || !rollbackReason) {
    return c.json({ error: 'optimizationRunId and rollbackReason are required' }, 400);
  }

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const rollback = await RollbackController.executeRollback(
    optimizationRunId,
    user?.id || null,
    rollbackReason
  );

  // Publish realtime event
  try {
    const bus = RealtimeEventBus.getInstance();
    bus.publish({
      id: `auto-roll-${Date.now()}`,
      eventType: 'autonomous.rollback.executed',
      orchestrationSessionId: '',
      payload: {
        optimizationRunId,
        rollbackId: rollback.id,
        reason: rollbackReason,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    // ignore
  }

  return c.json(rollback);
});

/**
 * GET /api/autonomous/adaptation
 * Fetch adaptation rules.
 */
autonomousRoutes.get('/adaptation', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const rules = await AdaptationProcessor.evaluateRules(projectId, workspaceId || null);
  return c.json({ rules });
});

/**
 * GET /api/autonomous/governance
 * Fetch governance compliance event logs.
 */
autonomousRoutes.get('/governance', async (c) => {
  const user = await resolveUser(c);
  const workspaceId = c.req.query('workspaceId');

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const events = await prisma.optimizationGovernanceEvent.findMany({
    where: { workspaceId: workspaceId || null },
    orderBy: { createdAt: 'desc' }
  });

  return c.json({ events });
});

/**
 * GET /api/autonomous/opportunities
 * Fetch optimization opportunities for a project.
 */
autonomousRoutes.get('/opportunities', async (c) => {
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const opportunities = await prisma.optimizationOpportunity.findMany({
    where: { projectId },
    orderBy: { score: 'desc' }
  });

  return c.json({ opportunities });
});

/**
 * GET /api/autonomous/recommendations
 * Fetch initiative recommendations for a project.
 */
autonomousRoutes.get('/recommendations', async (c) => {
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const recommendations = await prisma.initiativeRecommendation.findMany({
    where: { projectId },
    orderBy: { score: 'desc' },
    include: {
      decisions: { orderBy: { decidedAt: 'desc' } }
    }
  });

  return c.json({ recommendations });
});

/**
 * GET /api/autonomous/roadmaps
 * Fetch roadmaps for a project.
 */
autonomousRoutes.get('/roadmaps', async (c) => {
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const roadmaps = await prisma.optimizationRoadmap.findMany({
    where: { projectId },
    include: {
      recommendations: { orderBy: { score: 'desc' } }
    },
    orderBy: { quarter: 'asc' }
  });

  return c.json({ roadmaps });
});

/**
 * GET /api/autonomous/forecasts
 * Fetch optimization forecasts for a project.
 */
autonomousRoutes.get('/forecasts', async (c) => {
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const forecasts = await prisma.optimizationForecast.findMany({
    where: { projectId },
    include: {
      opportunity: true
    },
    orderBy: { currentValue: 'desc' }
  });

  return c.json({ forecasts });
});

/**
 * GET /api/autonomous/timeline
 * Fetch sequential implementation and decision timeline for a project.
 */
autonomousRoutes.get('/timeline', async (c) => {
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const events = await TimelineManager.getProjectTimeline(projectId);
  return c.json({ timeline: events });
});

/**
 * POST /api/autonomous/synthesize
 * Trigger cross-intelligence layer synthesis and populate opportunities & forecasts.
 */
autonomousRoutes.post('/synthesize', async (c) => {
  const { projectId } = await c.req.json().catch(() => ({}));
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  // 1. Run the synthesis engine
  const result = await SynthesisEngine.synthesize(projectId);

  // 2. Fetch or create an active optimization plan
  let plan = await prisma.optimizationPlan.findFirst({
    where: { projectId, status: 'ACTIVE' }
  });
  if (!plan) {
    plan = await prisma.optimizationPlan.create({
      data: {
        projectId,
        name: `Core UX Optimization Plan - ${new Date().toLocaleDateString()}`,
        description: 'Automatically synthesized optimization plan targeting live user behavior metrics.',
        status: 'ACTIVE'
      }
    });
  }

  // 3. Save each opportunity, forecast, and initiative candidate
  for (const op of result.opportunities) {
    const dbOp = await prisma.optimizationOpportunity.create({
      data: {
        projectId,
        opportunityType: op.opportunityType,
        title: op.title,
        description: op.description,
        evidence: JSON.stringify(op.evidence),
        score: op.score,
        impactPotential: op.impactPotential,
        userReach: op.userReach,
        severity: op.severity,
        confidence: op.confidence,
        survivabilityGain: op.survivabilityGain,
        implementationComplexity: op.implementationComplexity,
        status: 'ACTIVE'
      }
    });

    // Associated forecast
    const fc = result.forecasts.find(f => f.metricName === (
      op.opportunityType === 'ONBOARDING' ? 'onboarding_survivability' :
      op.opportunityType === 'HIGH_FRICTION' ? 'rage_click_rate' :
      op.opportunityType === 'CTA' ? 'cta_survivability' :
      op.opportunityType === 'NAVIGATION' ? 'navigation_survivability' :
      op.opportunityType === 'COGNITIVE' ? 'cognitive_survivability' : 'workflow_survivability'
    ));
    if (fc) {
      await prisma.optimizationForecast.create({
        data: {
          projectId,
          opportunityId: dbOp.id,
          planId: plan.id,
          metricName: fc.metricName,
          currentValue: fc.currentValue,
          forecastedValue: fc.forecastedValue,
          confidenceIntervalLower: fc.confidenceIntervalLower,
          confidenceIntervalUpper: fc.confidenceIntervalUpper,
          uncertaintyDetails: fc.uncertaintyDetails
        }
      });
    }

    // Associated InitiativeRecommendation
    const init = result.initiatives.find(i => i.impactArea === op.opportunityType);
    if (init) {
      await prisma.initiativeRecommendation.create({
        data: {
          projectId,
          planId: plan.id,
          opportunityId: dbOp.id,
          title: init.title,
          description: init.description,
          impactArea: init.impactArea,
          score: init.score,
          complexity: init.complexity,
          status: 'PROPOSED'
        }
      });
    }
  }

  return c.json({ success: true, count: result.opportunities.length });
});

/**
 * POST /api/autonomous/recommendations/:id/decide
 * Apply a human-in-the-loop governance decision on a recommendation.
 */
autonomousRoutes.post('/recommendations/:id/decide', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  if (!body.action) {
    return c.json({ error: 'action is required' }, 400);
  }

  const result = await RecommendationManager.decide(id, {
    userId: body.userId || 'demo_user',
    action: body.action,
    comments: body.comments,
    externalReference: body.externalReference
  });

  return c.json(result);
});

/**
 * POST /api/autonomous/roadmaps/proposal
 * Sequence initiatives/recommendations into a quarterly roadmap.
 */
autonomousRoutes.post('/roadmaps/proposal', async (c) => {
  const { projectId, initiativeIds } = await c.req.json().catch(() => ({}));

  if (!projectId || !initiativeIds || !Array.isArray(initiativeIds)) {
    return c.json({ error: 'projectId and initiativeIds array are required' }, 400);
  }

  const roadmaps = await RoadmapManager.buildRoadmapProposal(projectId, initiativeIds);
  return c.json({ roadmaps });
});
