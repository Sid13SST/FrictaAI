import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import { RedesignIntelligenceEngine } from '@fricta/redesign-intelligence';
import { RealtimeEventBus } from '@fricta/realtime';
import { RBACAuthorizationGuard } from '@fricta/rbac-core';

export const redesignRoutes = new Hono();
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
 * POST /api/redesign/generate
 * Trigger the redesign recommendation pipeline.
 */
redesignRoutes.post('/generate', async (c) => {
  const user = await resolveUser(c);
  const { projectId, workspaceId } = await c.req.json().catch(() => ({}));

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const results = await RedesignIntelligenceEngine.runRedesignPipeline(projectId, workspaceId || null);

  // Publish realtime redesign alert
  try {
    const bus = RealtimeEventBus.getInstance();
    bus.publish({
      id: `redesign-gen-${Date.now()}`,
      eventType: 'redesign.recommendation.generated',
      orchestrationSessionId: '',
      payload: {
        projectId,
        workspaceId: workspaceId || null,
        message: 'Redesign recommendations generated successfully',
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    // ignore
  }

  return c.json(results);
});

/**
 * GET /api/redesign/recommendations
 * Fetch redesign recommendations.
 */
redesignRoutes.get('/recommendations', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const recommendations = await prisma.redesignRecommendation.findMany({
    where: { projectId, workspaceId: workspaceId || null },
    include: {
      evidence: true,
      impactForecasts: true,
      redesignTraces: true
    },
    orderBy: { impactScore: 'desc' }
  });

  return c.json({ recommendations });
});

/**
 * GET /api/redesign/optimization
 * Fetch path workflow optimizations.
 */
redesignRoutes.get('/optimization', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const optimizations = await prisma.workflowOptimization.findMany({
    where: { projectId, workspaceId: workspaceId || null }
  });

  return c.json({ optimizations });
});

/**
 * GET /api/redesign/cognitive
 * Fetch cognitive simplifications.
 */
redesignRoutes.get('/cognitive', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const cognitiveRemediations = await prisma.cognitiveRemediation.findMany({
    where: { projectId, workspaceId: workspaceId || null }
  });

  return c.json({ cognitiveRemediations });
});

/**
 * GET /api/redesign/workflows
 * Fetch workflow step count reduction options.
 */
redesignRoutes.get('/workflows', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const workflowOptimizations = await prisma.workflowOptimization.findMany({
    where: { projectId, workspaceId: workspaceId || null }
  });

  return c.json({ workflowOptimizations });
});

/**
 * GET /api/redesign/evidence
 * Fetch evidence traces for a recommendation.
 */
redesignRoutes.get('/evidence', async (c) => {
  const recommendationId = c.req.query('recommendationId');
  if (!recommendationId) return c.json({ error: 'recommendationId is required' }, 400);

  const evidence = await prisma.recommendationEvidence.findMany({
    where: { recommendationId }
  });

  return c.json({ evidence });
});

/**
 * GET /api/redesign/impact
 * Fetch projected impact forecasts.
 */
redesignRoutes.get('/impact', async (c) => {
  const recommendationId = c.req.query('recommendationId');
  if (!recommendationId) return c.json({ error: 'recommendationId is required' }, 400);

  const forecasts = await prisma.recommendationImpactForecast.findMany({
    where: { recommendationId }
  });

  return c.json({ forecasts });
});

/**
 * GET /api/redesign/suggestions
 * Fetch general optimization suggestions (accessibility, friction).
 */
redesignRoutes.get('/suggestions', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const suggestions = await prisma.uXOptimizationSuggestion.findMany({
    where: { projectId, workspaceId: workspaceId || null }
  });

  return c.json({ suggestions });
});
