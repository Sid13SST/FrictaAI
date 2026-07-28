import { resolveUser } from '../middleware';
import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import {
  AuditLoggingService,
  SecurityMonitorService,
  TraceabilityService,
  ComplianceService,
  RetentionService,
  AlertsService
} from '@fricta/security-core';
import { RBACAuthorizationGuard } from '@fricta/rbac-core';
import { verifyWorkflowOwnership, verifyReportOwnership } from '../guards/ownership';

export const securityRoutes = new Hono();
const guard = new RBACAuthorizationGuard(prisma);

// These audit/security/alert tables use a nullable workspaceId ("null in
// Solo Mode" per schema). When no workspaceId is supplied, the underlying
// service queries `where: { workspaceId: null }`, which spans EVERY solo
// user on the platform, not just the caller — so the solo-mode branch must
// always be post-filtered down to the caller's own rows.
function scopeToCallerInSoloMode<T extends { userId?: string | null }>(rows: T[], callerId: string | undefined): T[] {
  if (!callerId) return [];
  return rows.filter((r) => r.userId === callerId);
}

/**
 * GET /api/security/audit
 * Returns chronological workspace audit timeline events.
 */
securityRoutes.get('/audit', async (c) => {
  const user = await resolveUser(c);
  const workspaceId = c.req.query('workspaceId');

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'TEAM', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const logs = await AuditLoggingService.getAuditTimeline(workspaceId);
  return c.json({ logs: workspaceId ? logs : scopeToCallerInSoloMode(logs, user?.id) });
});

/**
 * GET /api/security/events
 * Returns security-specific event timelines.
 */
securityRoutes.get('/events', async (c) => {
  const user = await resolveUser(c);
  const workspaceId = c.req.query('workspaceId');

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'TEAM', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const events = await SecurityMonitorService.getSecurityEvents(workspaceId);
  return c.json({ events: workspaceId ? events : scopeToCallerInSoloMode(events, user?.id) });
});

/**
 * GET /api/security/governance
 * Returns policy and role updates.
 */
securityRoutes.get('/governance', async (c) => {
  const user = await resolveUser(c);
  const workspaceId = c.req.query('workspaceId');

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'TEAM', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const events = await prisma.governancePolicyEvent.findMany({
    where: workspaceId ? { workspaceId } : { workspaceId: null, userId: user?.id || '__none__' },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return c.json({ events });
});

/**
 * GET /api/security/replays
 * Tracks access audits on specific workflow recording sessions.
 */
securityRoutes.get('/replays', async (c) => {
  const user = await resolveUser(c);
  const sessionId = c.req.query('sessionId');
  const workspaceId = c.req.query('workspaceId');

  if (!sessionId) return c.json({ error: 'sessionId is required' }, 400);

  const ownership = await verifyWorkflowOwnership(user?.id || '', sessionId);
  if (ownership === 'NOT_FOUND') return c.json({ error: 'Not found' }, 404);
  if (ownership === 'NOT_OWNED') return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'REPLAY', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const logs = await TraceabilityService.getReplayAuditTrail(sessionId);
  return c.json({ logs });
});

/**
 * GET /api/security/traceability
 * Resolves score/recommendation visual evidence mappings.
 */
securityRoutes.get('/traceability', async (c) => {
  const resourceType = c.req.query('resourceType') as 'REPORT' | 'SESSION';
  const resourceId = c.req.query('resourceId');
  const workspaceId = c.req.query('workspaceId');

  if (!resourceType || !resourceId) {
    return c.json({ error: 'resourceType and resourceId are required' }, 400);
  }

  const callerId = (await resolveUser(c))?.id || '';
  const ownership = resourceType === 'SESSION'
    ? await verifyWorkflowOwnership(callerId, resourceId)
    : await verifyReportOwnership(callerId, resourceId);
  if (ownership === 'NOT_FOUND') return c.json({ error: 'Not found' }, 404);
  if (ownership === 'NOT_OWNED') return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  if (workspaceId) {
    const user = await resolveUser(c);
    const hasPerm = await guard.checkWorkspacePermission(
      user?.id,
      workspaceId,
      resourceType === 'REPORT' ? 'ANALYTICS' : 'REPLAY',
      'READ'
    );
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const lineage = await TraceabilityService.traceEvidenceLineage(resourceType, resourceId);
  return c.json({ lineage });
});

/**
 * GET /api/security/alerts
 * Returns security alerts.
 */
securityRoutes.get('/alerts', async (c) => {
  const user = await resolveUser(c);
  const workspaceId = c.req.query('workspaceId');

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'TEAM', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const alerts = await AlertsService.getAlerts(workspaceId);
  return c.json({ alerts: workspaceId ? alerts : scopeToCallerInSoloMode(alerts, user?.id) });
});

/**
 * POST /api/security/alerts/resolve
 * Resolves a security alert.
 */
securityRoutes.post('/alerts/resolve', async (c) => {
  const user = await resolveUser(c);
  const { alertId, workspaceId } = await c.req.json().catch(() => ({}));

  if (!alertId) return c.json({ error: 'alertId is required' }, 400);

  const alert = await prisma.workspaceSecurityAlert.findUnique({ where: { id: alertId } });
  if (!alert) return c.json({ error: 'Not found' }, 404);

  if (alert.workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id, alert.workspaceId, 'TEAM', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  } else if (alert.userId !== user?.id) {
    return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'TEAM', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const resolved = await AlertsService.resolveAlert(alertId, user?.id || '');
  return c.json({ resolved });
});

/**
 * GET /api/security/compliance
 * Compiles dynamic SOC2 / ISO readiness scores.
 */
securityRoutes.get('/compliance', async (c) => {
  const user = await resolveUser(c);
  const workspaceId = c.req.query('workspaceId');

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'TEAM', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const report = await ComplianceService.evaluateComplianceReadiness(workspaceId || null);
  return c.json({ report });
});

/**
 * POST /api/security/compliance/retention
 * Configures retention record rules.
 */
securityRoutes.post('/compliance/retention', async (c) => {
  const user = await resolveUser(c);
  const { workspaceId, resourceType, resourceId, retentionDays, notes } = await c.req.json().catch(() => ({}));

  if (!resourceType || !resourceId || !retentionDays) {
    return c.json({ error: 'resourceType, resourceId, and retentionDays are required' }, 400);
  }

  if (workspaceId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'TEAM', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const record = await RetentionService.applyRetentionPolicy(
    workspaceId || null,
    resourceType,
    resourceId,
    retentionDays,
    notes
  );

  // Add audit log
  await AuditLoggingService.logAuditEvent({
    workspaceId: workspaceId || null,
    userId: user?.id || '',
    action: 'CONFIGURE_RETENTION',
    resource: 'ComplianceRetentionRecord',
    resourceId: record.id,
    description: `Retention policy of ${retentionDays} days configured for ${resourceType} resource: ${resourceId}`,
    metadata: { resourceType, resourceId, retentionDays }
  });

  return c.json({ record });
});
