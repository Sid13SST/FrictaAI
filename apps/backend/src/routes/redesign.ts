import { resolveUser } from '../middleware';
import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import { RedesignIntelligenceEngine } from '@fricta/redesign-intelligence';
import { RealtimeEventBus } from '@fricta/realtime';
import { RBACAuthorizationGuard } from '@fricta/rbac-core';
import { verifyProjectOwnership } from '../guards/ownership';

export const redesignRoutes = new Hono();
const guard = new RBACAuthorizationGuard(prisma);



/**
 * POST /api/redesign/generate
 * Trigger the redesign recommendation pipeline.
 */
redesignRoutes.post('/generate', async (c) => {
  const user = await resolveUser(c);
  const { projectId, workspaceId } = await c.req.json().catch(() => ({}));

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const ownership = await verifyProjectOwnership(user?.id || '', projectId);
  if (ownership === 'NOT_FOUND') return c.json({ error: 'Project not found' }, 404);
  if (ownership === 'NOT_OWNED') return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

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

  const ownership = await verifyProjectOwnership(user?.id || '', projectId);
  if (ownership === 'NOT_FOUND') return c.json({ error: 'Project not found' }, 404);
  if (ownership === 'NOT_OWNED') return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

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

  const ownership = await verifyProjectOwnership(user?.id || '', projectId);
  if (ownership === 'NOT_FOUND') return c.json({ error: 'Project not found' }, 404);
  if (ownership === 'NOT_OWNED') return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

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

  const ownership = await verifyProjectOwnership(user?.id || '', projectId);
  if (ownership === 'NOT_FOUND') return c.json({ error: 'Project not found' }, 404);
  if (ownership === 'NOT_OWNED') return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

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

  const ownership = await verifyProjectOwnership(user?.id || '', projectId);
  if (ownership === 'NOT_FOUND') return c.json({ error: 'Project not found' }, 404);
  if (ownership === 'NOT_OWNED') return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

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
  const user = await resolveUser(c);
  const recommendationId = c.req.query('recommendationId');
  if (!recommendationId) return c.json({ error: 'recommendationId is required' }, 400);

  const recommendation = await prisma.redesignRecommendation.findUnique({
    where: { id: recommendationId },
    select: { projectId: true }
  });
  if (!recommendation) return c.json({ error: 'Recommendation not found' }, 404);

  const ownership = await verifyProjectOwnership(user?.id || '', recommendation.projectId);
  if (ownership === 'NOT_FOUND') return c.json({ error: 'Project not found' }, 404);
  if (ownership === 'NOT_OWNED') return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

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
  const user = await resolveUser(c);
  const recommendationId = c.req.query('recommendationId');
  if (!recommendationId) return c.json({ error: 'recommendationId is required' }, 400);

  const recommendation = await prisma.redesignRecommendation.findUnique({
    where: { id: recommendationId },
    select: { projectId: true }
  });
  if (!recommendation) return c.json({ error: 'Recommendation not found' }, 404);

  const ownership = await verifyProjectOwnership(user?.id || '', recommendation.projectId);
  if (ownership === 'NOT_FOUND') return c.json({ error: 'Project not found' }, 404);
  if (ownership === 'NOT_OWNED') return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

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

  const ownership = await verifyProjectOwnership(user?.id || '', projectId);
  if (ownership === 'NOT_FOUND') return c.json({ error: 'Project not found' }, 404);
  if (ownership === 'NOT_OWNED') return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', workspaceId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const suggestions = await prisma.uXOptimizationSuggestion.findMany({
    where: { projectId, workspaceId: workspaceId || null }
  });

  return c.json({ suggestions });
});
