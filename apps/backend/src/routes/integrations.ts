import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import {
  OAuthManager,
  IntegrationPermissionGuard,
  FigmaConnector,
  FigJamConnector,
  JiraConnector,
  LinearConnector,
  GitHubConnector,
  NotionConnector,
  ProductboardConnector,
  WebhookHandler,
  SyncJobOrchestrator,
  IntegrationEventEmitter,
  IntegrationTimeline,
  IntegrationRouter,
  IntegrationGovernanceLogger
} from '@fricta/integration-core';
import { RealtimeEventBus } from '@fricta/realtime';

export const integrationRoutes = new Hono();

// ─── Helper: Resolve user ────────────────────────────────────────────────────
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

function publishIntegrationEvent(eventType: string, payload: any): void {
  try {
    const bus = RealtimeEventBus.getInstance();
    bus.publish({
      id: `int-${Date.now()}`,
      eventType: eventType as any,
      orchestrationSessionId: '',
      payload: { ...payload, timestamp: new Date().toISOString() }
    });
  } catch {}
}

// ─── GET /api/integrations/providers ─────────────────────────────────────────
integrationRoutes.get('/providers', async (c) => {
  const providers = IntegrationRouter.getSupportedProviders().map(p => ({
    provider: p,
    displayName: IntegrationRouter.getProviderDisplayName(p),
    oauthUrl: IntegrationRouter.getProviderOAuthUrl(p),
    scopes: IntegrationRouter.getProviderScopes(p)
  }));
  return c.json({ providers });
});

// ─── GET /api/integrations/connections ───────────────────────────────────────
integrationRoutes.get('/connections', async (c) => {
  const user = await resolveUser(c);
  const workspaceId = c.req.query('workspaceId') || null;

  const canRead = await IntegrationPermissionGuard.canReadIntegrations(user?.id || '', workspaceId);
  if (!canRead) return c.json({ error: 'Forbidden' }, 403);

  const integrations = await OAuthManager.listIntegrations(workspaceId);
  return c.json({ integrations });
});

// ─── POST /api/integrations/oauth/connect ────────────────────────────────────
integrationRoutes.post('/oauth/connect', async (c) => {
  const user = await resolveUser(c);
  const {
    workspaceId, provider, accessToken, refreshToken,
    tokenExpiresAt, providerUserId, providerOrgId, scopes, metadata
  } = await c.req.json().catch(() => ({}));

  if (!provider || !accessToken) {
    return c.json({ error: 'provider and accessToken are required' }, 400);
  }

  const canManage = await IntegrationPermissionGuard.canManageIntegrations(user?.id || '', workspaceId || null);
  if (!canManage) return c.json({ error: 'Forbidden: Requires ADMIN or OWNER role' }, 403);

  const integration = await OAuthManager.upsertToken(
    workspaceId || null,
    provider,
    accessToken,
    refreshToken,
    tokenExpiresAt ? new Date(tokenExpiresAt) : undefined,
    providerUserId,
    providerOrgId,
    scopes,
    metadata
  );

  await IntegrationGovernanceLogger.log(
    provider, 'CONNECT',
    `${provider} integration connected via OAuth`,
    workspaceId || null, user?.id, integration.id
  );

  publishIntegrationEvent('integration.connected', { provider, integrationId: integration.id, workspaceId });

  return c.json({ integration });
});

// ─── DELETE /api/integrations/oauth/revoke ───────────────────────────────────
integrationRoutes.delete('/oauth/revoke', async (c) => {
  const user = await resolveUser(c);
  const { workspaceId, provider } = await c.req.json().catch(() => ({}));

  if (!provider) return c.json({ error: 'provider is required' }, 400);

  const canManage = await IntegrationPermissionGuard.canManageIntegrations(user?.id || '', workspaceId || null);
  if (!canManage) return c.json({ error: 'Forbidden' }, 403);

  await OAuthManager.revokeToken(workspaceId || null, provider);
  await IntegrationGovernanceLogger.log(
    provider, 'DISCONNECT',
    `${provider} integration token revoked`,
    workspaceId || null, user?.id
  );

  return c.json({ success: true, message: `${provider} integration disconnected` });
});

// ─── POST /api/integrations/figma/link ───────────────────────────────────────
integrationRoutes.post('/figma/link', async (c) => {
  const user = await resolveUser(c);
  const {
    projectId, connectionId, workflowSessionId, frameNodeId,
    frameName, frameUrl, replayContext, workspaceId
  } = await c.req.json().catch(() => ({}));

  if (!projectId || !frameNodeId || !replayContext) {
    return c.json({ error: 'projectId, frameNodeId, replayContext required' }, 400);
  }

  const canPush = await IntegrationPermissionGuard.canPushEvidence(user?.id || '', workspaceId || null);
  if (!canPush) return c.json({ error: 'Forbidden' }, 403);

  const link = await FigmaConnector.linkReplayToFrame(
    projectId, connectionId || null, workflowSessionId || replayContext.sessionId,
    frameNodeId, frameName || frameNodeId, frameUrl || '', replayContext
  );

  await IntegrationGovernanceLogger.log('FIGMA', 'REPLAY_LINKED', `Replay linked to Figma frame ${frameNodeId}`, workspaceId || null, user?.id, link.id);
  publishIntegrationEvent('integration.replay.linked', { provider: 'FIGMA', linkId: link.id, frameNodeId });

  return c.json({ link });
});

// ─── POST /api/integrations/figma/attach ─────────────────────────────────────
integrationRoutes.post('/figma/attach', async (c) => {
  const user = await resolveUser(c);
  const { projectId, connectionId, frameNodeId, finding, workspaceId } = await c.req.json().catch(() => ({}));

  if (!projectId || !frameNodeId || !finding) {
    return c.json({ error: 'projectId, frameNodeId, finding required' }, 400);
  }

  const attachment = await FigmaConnector.attachFindingToFrame(projectId, connectionId || null, frameNodeId, finding);

  await IntegrationGovernanceLogger.log('FIGMA', 'EVIDENCE_ATTACHED', `Finding attached to Figma frame ${frameNodeId}`, workspaceId || null, user?.id, attachment.id);
  publishIntegrationEvent('integration.evidence.attached', { provider: 'FIGMA', attachmentId: attachment.id, frameNodeId });

  return c.json({ attachment });
});

// ─── POST /api/integrations/jira/ticket ──────────────────────────────────────
integrationRoutes.post('/jira/ticket', async (c) => {
  const user = await resolveUser(c);
  const { connectionId, projectId, finding, replayContext, jiraConfig, workspaceId } = await c.req.json().catch(() => ({}));

  if (!connectionId || !projectId || !finding || !replayContext || !jiraConfig) {
    return c.json({ error: 'connectionId, projectId, finding, replayContext, jiraConfig required' }, 400);
  }

  const canPush = await IntegrationPermissionGuard.canPushEvidence(user?.id || '', workspaceId || null);
  if (!canPush) return c.json({ error: 'Forbidden' }, 403);

  const result = await JiraConnector.createTicketFromFinding(connectionId, projectId, finding, replayContext, jiraConfig);

  await IntegrationGovernanceLogger.log('JIRA', 'TICKET_CREATED', `Jira ticket ${result.externalKey} created from UX finding`, workspaceId || null, user?.id, result.externalKey);
  publishIntegrationEvent('integration.sync.completed', { provider: 'JIRA', externalKey: result.externalKey });

  return c.json(result);
});

// ─── POST /api/integrations/linear/task ──────────────────────────────────────
integrationRoutes.post('/linear/task', async (c) => {
  const user = await resolveUser(c);
  const { connectionId, projectId, finding, replayContext, linearConfig, workspaceId } = await c.req.json().catch(() => ({}));

  if (!connectionId || !projectId || !finding || !replayContext || !linearConfig) {
    return c.json({ error: 'connectionId, projectId, finding, replayContext, linearConfig required' }, 400);
  }

  const result = await LinearConnector.createTaskFromFinding(connectionId, projectId, finding, replayContext, linearConfig);

  await IntegrationGovernanceLogger.log('LINEAR', 'TICKET_CREATED', `Linear task ${result.taskId} created from UX finding`, workspaceId || null, user?.id, result.taskId);
  publishIntegrationEvent('integration.sync.completed', { provider: 'LINEAR', taskId: result.taskId });

  return c.json(result);
});

// ─── POST /api/integrations/github/link ──────────────────────────────────────
integrationRoutes.post('/github/link', async (c) => {
  const user = await resolveUser(c);
  const { connectionId, projectId, prNumber, prTitle, prUrl, finding, replayContext, githubConfig, workspaceId } = await c.req.json().catch(() => ({}));

  if (!connectionId || !projectId || !prNumber || !replayContext || !githubConfig) {
    return c.json({ error: 'connectionId, projectId, prNumber, replayContext, githubConfig required' }, 400);
  }

  const link = await GitHubConnector.linkFindingToPR(
    connectionId, projectId, prNumber, prTitle || `PR #${prNumber}`,
    prUrl || '', finding || { title: 'UX Finding', description: '', severity: 'MEDIUM' },
    replayContext, githubConfig
  );

  await IntegrationGovernanceLogger.log('GITHUB', 'REPLAY_LINKED', `Replay linked to GitHub PR #${prNumber}`, workspaceId || null, user?.id, link.id);
  publishIntegrationEvent('integration.replay.linked', { provider: 'GITHUB', linkId: link.id, prNumber });

  return c.json({ link });
});

// ─── POST /api/integrations/notion/page ──────────────────────────────────────
integrationRoutes.post('/notion/page', async (c) => {
  const user = await resolveUser(c);
  const { connectionId, projectId, finding, replayContext, notionConfig, workspaceId } = await c.req.json().catch(() => ({}));

  if (!connectionId || !projectId || !finding || !replayContext) {
    return c.json({ error: 'connectionId, projectId, finding, replayContext required' }, 400);
  }

  const attachment = await NotionConnector.createEvidencePage(
    connectionId, projectId, finding, replayContext, notionConfig || {}
  );

  await IntegrationGovernanceLogger.log('NOTION', 'EVIDENCE_ATTACHED', `Notion evidence page created: ${attachment.title}`, workspaceId || null, user?.id, attachment.id);
  publishIntegrationEvent('integration.evidence.attached', { provider: 'NOTION', attachmentId: attachment.id });

  return c.json({ attachment });
});

// ─── POST /api/integrations/productboard/evidence ────────────────────────────
integrationRoutes.post('/productboard/evidence', async (c) => {
  const user = await resolveUser(c);
  const { connectionId, projectId, featureId, featureName, finding, replayContext, workspaceId } = await c.req.json().catch(() => ({}));

  if (!connectionId || !projectId || !featureId || !finding || !replayContext) {
    return c.json({ error: 'connectionId, projectId, featureId, finding, replayContext required' }, 400);
  }

  const attachment = await ProductboardConnector.routeEvidenceToFeature(
    connectionId, projectId, featureId, featureName || featureId, finding, replayContext
  );

  await IntegrationGovernanceLogger.log('PRODUCTBOARD', 'EVIDENCE_ATTACHED', `Evidence routed to Productboard feature ${featureId}`, workspaceId || null, user?.id, attachment.id);
  publishIntegrationEvent('integration.evidence.attached', { provider: 'PRODUCTBOARD', featureId });

  return c.json({ attachment });
});

// ─── POST /api/integrations/webhooks/:provider ───────────────────────────────
integrationRoutes.post('/webhooks/:provider', async (c) => {
  const provider = c.req.param('provider').toUpperCase();
  const workspaceId = c.req.query('workspaceId') || null;
  const payload = await c.req.json().catch(() => ({}));

  const eventType = payload.event_type || payload.action || 'WEBHOOK_RECEIVED';

  const result = await WebhookHandler.processIncoming(
    provider as any, eventType, payload, workspaceId
  );

  if (result.processed) {
    await IntegrationGovernanceLogger.log(provider as any, 'WEBHOOK_RECEIVED', `${provider} webhook received: ${eventType}`, workspaceId);
    publishIntegrationEvent('integration.webhook.received', { provider, eventType, eventId: result.eventId });
  }

  return c.json({ received: true, processed: result.processed, eventId: result.eventId });
});

// ─── GET /api/integrations/events ────────────────────────────────────────────
integrationRoutes.get('/events', async (c) => {
  const user = await resolveUser(c);
  const workspaceId = c.req.query('workspaceId') || null;
  const projectId = c.req.query('projectId') || undefined;
  const provider = c.req.query('provider') || undefined;
  const limit = parseInt(c.req.query('limit') || '100');

  const timeline = await IntegrationTimeline.getUnifiedTimeline(
    workspaceId, projectId, provider as any, limit
  );

  return c.json(timeline);
});

// ─── GET /api/integrations/sync/jobs ─────────────────────────────────────────
integrationRoutes.get('/sync/jobs', async (c) => {
  const integrationId = c.req.query('integrationId');
  const status = c.req.query('status');

  if (!integrationId) return c.json({ error: 'integrationId is required' }, 400);

  const jobs = await SyncJobOrchestrator.listJobs(integrationId, status as any);
  return c.json({ jobs });
});

// ─── GET /api/integrations/governance ────────────────────────────────────────
integrationRoutes.get('/governance', async (c) => {
  const user = await resolveUser(c);
  const workspaceId = c.req.query('workspaceId') || null;
  const provider = c.req.query('provider') || undefined;

  const events = await IntegrationGovernanceLogger.getAuditLog(workspaceId, provider as any);
  return c.json({ events });
});

// ─── GET /api/integrations/replay-links ──────────────────────────────────────
integrationRoutes.get('/replay-links', async (c) => {
  const projectId = c.req.query('projectId');
  const provider = c.req.query('provider');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const links = await prisma.replayLink.findMany({
    where: { projectId, ...(provider ? { provider } : {}) },
    orderBy: { createdAt: 'desc' }
  });

  return c.json({ links });
});

// ─── GET /api/integrations/evidence ──────────────────────────────────────────
integrationRoutes.get('/evidence', async (c) => {
  const projectId = c.req.query('projectId');
  const provider = c.req.query('provider');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const attachments = await prisma.evidenceAttachment.findMany({
    where: { projectId, ...(provider ? { provider } : {}) },
    orderBy: { createdAt: 'desc' }
  });

  return c.json({ attachments });
});
