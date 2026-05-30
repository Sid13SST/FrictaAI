import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import { RBACAuthorizationGuard } from '@fricta/rbac-core';

export const liveIntelligenceRoutes = new Hono();
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
 * GET /api/live/anomalies
 * Retrieves active or resolved UX anomalies.
 */
liveIntelligenceRoutes.get('/anomalies', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const isResolved = c.req.query('isResolved') === 'true';

  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }

  const anomalies = await prisma.uXAnomaly.findMany({
    where: {
      projectId,
      isResolved,
    },
    include: {
      evidence: {
        include: {
          liveSession: true,
        },
      },
      correlatedBehaviors: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return c.json({ anomalies });
});

/**
 * GET /api/live/anomalies/:id
 * Retrieves detail view of a single anomaly.
 */
liveIntelligenceRoutes.get('/anomalies/:id', async (c) => {
  const anomalyId = c.req.param('id');

  const anomaly = await prisma.uXAnomaly.findUnique({
    where: { id: anomalyId },
    include: {
      evidence: {
        include: {
          liveSession: true,
        },
      },
      correlatedBehaviors: true,
      riskEscalations: true,
    },
  });

  if (!anomaly) {
    return c.json({ error: 'Anomaly not found' }, 404);
  }

  return c.json({ anomaly });
});

/**
 * GET /api/live/behavior
 * Retrieves captured behavioral patterns.
 */
liveIntelligenceRoutes.get('/behavior', async (c) => {
  const projectId = c.req.query('projectId');

  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }

  const patterns = await prisma.behavioralPattern.findMany({
    where: { projectId },
    include: {
      evidence: {
        include: {
          liveSession: true,
        },
      },
      correlatedBehaviors: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  return c.json({ patterns });
});

/**
 * GET /api/live/survivability
 * Retrieves latest workflow survivability scores.
 */
liveIntelligenceRoutes.get('/survivability', async (c) => {
  const projectId = c.req.query('projectId');
  const limit = parseInt(c.req.query('limit') || '30');

  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }

  const metrics = await prisma.survivabilityMetric.findMany({
    where: { projectId },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });

  return c.json({ metrics });
});

/**
 * GET /api/live/baselines
 * Retrieves production performance baselines.
 */
liveIntelligenceRoutes.get('/baselines', async (c) => {
  const projectId = c.req.query('projectId');

  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }

  const baselines = await prisma.productionBaseline.findMany({
    where: { projectId },
    orderBy: { updatedAt: 'desc' },
  });

  return c.json({ baselines });
});

/**
 * GET /api/live/alerts
 * Retrieves recent intelligence alerts.
 */
liveIntelligenceRoutes.get('/alerts', async (c) => {
  const projectId = c.req.query('projectId');
  const limit = parseInt(c.req.query('limit') || '20');

  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }

  const alerts = await prisma.intelligenceAlert.findMany({
    where: { projectId },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });

  return c.json({ alerts });
});

/**
 * POST /api/live/alerts/:id/read
 * Marks an alert as read.
 */
liveIntelligenceRoutes.post('/alerts/:id/read', async (c) => {
  const alertId = c.req.param('id');

  try {
    const alert = await prisma.intelligenceAlert.update({
      where: { id: alertId },
      data: { isRead: true },
    });
    return c.json({ success: true, alert });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to update alert' }, 500);
  }
});

/**
 * GET /api/live/correlations
 * Retrieves all correlation findings.
 */
liveIntelligenceRoutes.get('/correlations', async (c) => {
  const projectId = c.req.query('projectId');

  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }

  const correlations = await prisma.correlatedBehavior.findMany({
    where: {
      OR: [
        { anomaly: { projectId } },
        { pattern: { projectId } }
      ]
    },
    orderBy: { timestamp: 'desc' },
  });

  return c.json({ correlations });
});

/**
 * POST /api/live/sync
 * Manually executes the live detection analysis pipeline on all active sessions of a project.
 */
liveIntelligenceRoutes.post('/sync', async (c) => {
  const projectId = c.req.query('projectId');
  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }

  try {
    const { LiveAnomalyDetector } = await import('@fricta/live-intelligence');
    const activeSessions = await prisma.liveSession.findMany({
      where: { projectId, status: 'ACTIVE' },
      select: { id: true },
    });

    for (const session of activeSessions) {
      await LiveAnomalyDetector.analyzeSessionEvents(session.id);
    }

    return c.json({ success: true, processedCount: activeSessions.length });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to trigger live intelligence sync' }, 500);
  }
});
