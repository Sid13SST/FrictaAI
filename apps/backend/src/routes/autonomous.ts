import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import {
  AutonomousOptimizationEngine,
  AdaptationProcessor,
  OptimizationSimulator,
  RollbackController
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
