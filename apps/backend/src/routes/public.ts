import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import { ApiKeyManager, RateLimiter } from '@fricta/developer-platform';

export const publicRoutes = new Hono<{
  Variables: {
    projectId: string;
    apiKeyId: string | null;
  };
}>();

// ─── AUTHENTICATION & RATE LIMITING MIDDLEWARE ────────────────────────────────
publicRoutes.use('/*', async (c, next) => {
  const path = c.req.path;
  
  // Allow key generation without API key header (simulated user session)
  if (path === '/api/public/keys' || path === '/public/keys') {
    return next();
  }

  const apiKeyHeader = c.req.header('x-api-key') || c.req.header('Authorization')?.replace('Bearer ', '');

  if (!apiKeyHeader) {
    return c.json({ error: 'Unauthorized: Missing API Key header x-api-key' }, 401);
  }

  const start = Date.now();
  const validation = await ApiKeyManager.validateKey(apiKeyHeader);

  if (!validation.isValid || !validation.projectId) {
    return c.json({ error: 'Unauthorized: Invalid or expired API key' }, 401);
  }

  const projectId = validation.projectId;
  const keyHash = ApiKeyManager.hashKey(apiKeyHeader);

  // Enforce Token Bucket Rate Limiting (Capacity: 100 requests, Refill: 5/sec)
  const rateLimit = await RateLimiter.checkLimit(keyHash, 100, 5);
  if (!rateLimit.allowed) {
    return c.json({ error: 'Too Many Requests: Rate limit exceeded.' }, 429);
  }

  // Bind parameters to context
  c.set('projectId', projectId);
  c.set('apiKeyId', keyHash); // Use key hash as identifier

  await next();

  // Log usage telemetry post-execution
  const duration = Date.now() - start;
  await ApiKeyManager.logUsage(
    c.var.apiKeyId,
    c.req.path,
    c.req.method,
    c.res.status,
    duration
  );
});

// ─── PUBLIC ENDPOINTS ─────────────────────────────────────────────────────────

/**
 * GET /api/public/replays
 * Returns timeline events, actions, and cognitive signals for session replays.
 */
publicRoutes.get('/replays', async (c) => {
  const projectId = c.var.projectId;
  
  const sessions = await prisma.workflowSession.findMany({
    where: { projectId },
    include: {
      workflowScreenshots: { orderBy: { stepIndex: 'asc' } },
      actions: { orderBy: { stepNumber: 'asc' } },
      replayExecutions: true
    },
    take: 20
  });

  const formattedReplays = sessions.map(s => ({
    sessionId: s.id,
    goal: s.goal,
    status: s.status,
    startedAt: s.startedAt,
    overallSurvivability: s.replayExecutions[0]?.survivabilityRate ?? 95.0,
    overallCognitiveLoad: s.replayExecutions[0]?.cognitiveLoad ?? 12.0,
    timelineSteps: s.workflowScreenshots.map(shot => {
      const relatedAction = s.actions.find(a => a.stepNumber === shot.stepIndex);
      return {
        stepIndex: shot.stepIndex,
        url: shot.pageUrl,
        actionType: relatedAction?.action || 'PAGE_VIEW',
        targetElement: relatedAction?.target || 'body',
        timestamp: shot.timestamp
      };
    })
  }));

  return c.json({ replays: formattedReplays });
});

/**
 * GET /api/public/findings
 * Returns compiled usability findings, severities, and recommendations.
 */
publicRoutes.get('/findings', async (c) => {
  const projectId = c.var.projectId;

  const findings = await prisma.uXFinding.findMany({
    where: {
      session: { projectId }
    },
    orderBy: { timestamp: 'desc' },
    take: 50
  });

  const formattedFindings = findings.map(f => ({
    findingId: f.id,
    title: f.title,
    category: f.findingType,
    severity: f.severity,
    description: f.description,
    recommendation: f.recommendation,
    timestamp: f.timestamp
  }));

  return c.json({ findings: formattedFindings });
});

/**
 * GET /api/public/investigations
 * Exposes active investigation rooms/threads.
 */
publicRoutes.get('/investigations', async (c) => {
  const projectId = c.var.projectId;

  const threads = await prisma.investigationThread.findMany({
    where: { projectId },
    include: {
      annotations: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  const formattedInvestigations = threads.map(t => ({
    threadId: t.id,
    title: t.title,
    status: t.status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    commentCount: t.annotations.length
  }));

  return c.json({ investigations: formattedInvestigations });
});

/**
 * GET /api/public/reports
 * Returns executive summaries and scores.
 */
publicRoutes.get('/reports', async (c) => {
  const projectId = c.var.projectId;

  const reports = await prisma.executiveReport.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  const formattedReports = reports.map(r => ({
    reportId: r.id,
    title: r.title,
    score: Math.round(r.stabilityScore),
    summary: r.summary,
    createdAt: r.createdAt
  }));

  return c.json({ reports: formattedReports });
});

/**
 * POST /api/public/webhooks
 * Registers a webhook endpoint for external workflow triggers.
 */
publicRoutes.post('/webhooks', async (c) => {
  const projectId = c.var.projectId;
  const body = await c.req.json().catch(() => ({}));
  const { url, secret, events } = body;

  if (!url || !secret || !events || !Array.isArray(events)) {
    return c.json({ error: 'url, secret, and events (array) are required' }, 400);
  }

  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      projectId,
      url,
      secret,
      events,
      active: true
    }
  });

  return c.json({ success: true, endpoint });
});

/**
 * POST /api/public/keys
 * Plain endpoint to generate an API key (used by developer playground console).
 */
publicRoutes.post('/keys', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { projectId, name, scopes } = body;

  if (!projectId || !name || !scopes) {
    return c.json({ error: 'projectId, name, and scopes (array) are required' }, 400);
  }

  const result = await ApiKeyManager.generateKey({
    projectId,
    name,
    scopes
  });

  return c.json({ success: true, ...result });
});
