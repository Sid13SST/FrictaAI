import { resolveUser } from '../middleware';
import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import { RealtimeEventBus } from '@fricta/realtime';
import {
  WorkspaceRoleManager,
  WorkspacePolicyEvaluator,
  WorkspaceTenancyManager,
  WorkspaceProjectScopeManager,
  WorkspaceInvestigationSecurityManager,
  SharedAccessGrantManager,
  ReplayScopeManager,
  WorkspaceSecurityAuditLogger,
  RBACAuthorizationGuard
} from '@fricta/rbac-core';

export const rbacCoreRoutes = new Hono();

const roleManager = new WorkspaceRoleManager(prisma);
const policyEvaluator = new WorkspacePolicyEvaluator(prisma);
const tenancyManager = new WorkspaceTenancyManager(prisma);
const projectScopeManager = new WorkspaceProjectScopeManager(prisma);
const investigationSecurityManager = new WorkspaceInvestigationSecurityManager(prisma);
const grantManager = new SharedAccessGrantManager(prisma);
const replayScopeManager = new ReplayScopeManager(prisma);
const auditLogger = new WorkspaceSecurityAuditLogger(prisma);
const guard = new RBACAuthorizationGuard(prisma);



/**
 * GET /rbac/roles
 * Returns all roles in workspace
 */
rbacCoreRoutes.get('/roles', async (c) => {
  const user = await resolveUser(c);
  const workspaceId = c.req.query('workspaceId');
  if (!workspaceId) return c.json({ error: 'workspaceId is required' }, 400);

  const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'WORKSPACE', 'READ');
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const roles = await roleManager.getRoles(workspaceId);
  return c.json({ roles });
});

/**
 * POST /rbac/roles
 * Creates or updates custom role
 */
rbacCoreRoutes.post('/roles', async (c) => {
  const user = await resolveUser(c);
  const { workspaceId, roleName, description, permissions } = await c.req.json().catch(() => ({}));

  if (!workspaceId || !roleName) {
    return c.json({ error: 'workspaceId and roleName are required' }, 400);
  }

  // Guard: check permission
  const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'WORKSPACE', 'MANAGE');
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  try {
    const role = await roleManager.upsertCustomRole(workspaceId, roleName, description || '', permissions || []);
    
    // Log security event
    await auditLogger.logSecurityEvent(
      workspaceId,
      user?.id || null,
      'ROLE_CHANGE',
      'INFO',
      `Upserted custom role "${roleName.toUpperCase()}"`,
      { roleId: role?.id }
    );

    // Broadcast
    RealtimeEventBus.getInstance().publish({
      orchestrationSessionId: workspaceId,
      eventType: 'workspace.roles.updated',
      payload: { workspaceId, role },
    });

    return c.json({ role });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

/**
 * DELETE /rbac/roles/:id
 * Deletes custom role
 */
rbacCoreRoutes.delete('/roles/:id', async (c) => {
  const user = await resolveUser(c);
  const roleId = c.req.param('id');
  const workspaceId = c.req.query('workspaceId');

  if (!workspaceId) return c.json({ error: 'workspaceId query parameter is required' }, 400);

  // Guard: check permission
  const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'WORKSPACE', 'MANAGE');
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  try {
    await roleManager.deleteCustomRole(workspaceId, roleId);

    // Log security event
    await auditLogger.logSecurityEvent(
      workspaceId,
      user?.id || null,
      'ROLE_CHANGE',
      'WARNING',
      `Deleted custom role with ID: ${roleId}`
    );

    // Broadcast
    RealtimeEventBus.getInstance().publish({
      orchestrationSessionId: workspaceId,
      eventType: 'workspace.roles.updated',
      payload: { workspaceId, roleId },
    });

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

/**
 * GET /rbac/policies
 * Fetches all policies for workspace
 */
rbacCoreRoutes.get('/policies', async (c) => {
  const user = await resolveUser(c);
  const workspaceId = c.req.query('workspaceId');
  if (!workspaceId) return c.json({ error: 'workspaceId is required' }, 400);

  const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'WORKSPACE', 'READ');
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const keys = [
    'inviteRestrictions',
    'externalSharing',
    'guestAccess',
    'replaySharing',
    'exportRestrictions',
    'workspaceVisibility',
  ] as const;

  const policies = await Promise.all(
    keys.map(async (key) => ({
      key,
      value: await policyEvaluator.getPolicy(workspaceId, key),
    }))
  );

  return c.json({ policies });
});

/**
 * POST /rbac/policies
 * Sets policy configuration
 */
rbacCoreRoutes.post('/policies', async (c) => {
  const user = await resolveUser(c);
  const { workspaceId, key, value } = await c.req.json().catch(() => ({}));

  if (!workspaceId || !key || !value) {
    return c.json({ error: 'workspaceId, key, and value are required' }, 400);
  }

  // Guard: check permission
  const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'WORKSPACE', 'MANAGE');
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const policy = await policyEvaluator.setPolicy(workspaceId, key, value);

  // Log security event
  await auditLogger.logSecurityEvent(
    workspaceId,
    user?.id || null,
    'POLICY_UPDATE',
    'WARNING',
    `Updated policy "${key}" to "${value}"`
  );

  // Broadcast
  RealtimeEventBus.getInstance().publish({
    orchestrationSessionId: workspaceId,
    eventType: 'workspace.policy.updated',
    payload: { workspaceId, key, value },
  });

  return c.json({ policy });
});

/**
 * GET /rbac/access
 * Retrieves active shared grants
 */
rbacCoreRoutes.get('/access', async (c) => {
  const user = await resolveUser(c);
  const workspaceId = c.req.query('workspaceId');
  if (!workspaceId) return c.json({ error: 'workspaceId is required' }, 400);

  const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'INVESTIGATION', 'READ');
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const grants = await grantManager.getWorkspaceGrants(workspaceId);
  return c.json({ grants });
});

/**
 * POST /rbac/access
 * Grants sharing access (external link or specific user)
 */
rbacCoreRoutes.post('/access', async (c) => {
  const user = await resolveUser(c);
  const { workspaceId, resourceType, resourceId, granteeId, granteeEmail, durationDays } = await c.req.json().catch(() => ({}));

  if (!workspaceId || !resourceType || !resourceId) {
    return c.json({ error: 'workspaceId, resourceType, and resourceId are required' }, 400);
  }

  // Guard: check permission
  const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'INVESTIGATION', 'MANAGE');
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  // Verify external sharing controls if external email is targeted
  if (granteeEmail) {
    const isAllowed = await policyEvaluator.evaluateActionAgainstPolicy(
      workspaceId,
      'externalSharing',
      user ? await tenancyManager.resolveMemberRole(workspaceId, user.id) || 'VIEWER' : 'VIEWER'
    );
    if (!isAllowed) {
      return c.json({ error: 'Forbidden: External sharing is disabled by active workspace policy' }, 403);
    }
  }

  const grant = await grantManager.grantAccess(workspaceId, resourceType, resourceId, {
    granteeId,
    granteeEmail,
    durationDays,
  });

  // Log event
  await auditLogger.logSecurityEvent(
    workspaceId,
    user?.id || null,
    granteeEmail ? 'EXTERNAL_SHARE' : 'ROLE_CHANGE',
    granteeEmail ? 'WARNING' : 'INFO',
    `Granted ${resourceType} access to ${granteeEmail || granteeId}`,
    { grantId: grant.id }
  );

  return c.json({ grant });
});

/**
 * POST /rbac/access/revoke
 * Revokes access grant
 */
rbacCoreRoutes.post('/access/revoke', async (c) => {
  const user = await resolveUser(c);
  const { workspaceId, grantId } = await c.req.json().catch(() => ({}));

  if (!workspaceId || !grantId) {
    return c.json({ error: 'workspaceId and grantId are required' }, 400);
  }

  // Guard: check permission
  const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'INVESTIGATION', 'MANAGE');
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  await grantManager.revokeAccess(grantId);

  // Log event
  await auditLogger.logSecurityEvent(
    workspaceId,
    user?.id || null,
    'REVOCATION',
    'WARNING',
    `Revoked shared grant with ID: ${grantId}`
  );

  // Broadcast
  RealtimeEventBus.getInstance().publish({
    orchestrationSessionId: workspaceId,
    eventType: 'workspace.access.revoked',
    payload: { workspaceId, grantId },
  });

  return c.json({ success: true });
});

/**
 * GET /rbac/investigations
 * Retrieves specific investigation access settings
 */
rbacCoreRoutes.get('/investigations', async (c) => {
  const user = await resolveUser(c);
  const workspaceId = c.req.query('workspaceId');
  const sharedInvestigationId = c.req.query('sharedInvestigationId');

  if (!workspaceId || !sharedInvestigationId) {
    return c.json({ error: 'workspaceId and sharedInvestigationId are required' }, 400);
  }

  const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'INVESTIGATION', 'READ');
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const accesses = await prisma.investigationAccess.findMany({
    where: { workspaceId, sharedInvestigationId },
  });

  return c.json({ accesses });
});

/**
 * POST /rbac/investigations
 * Configures specific investigation access settings
 */
rbacCoreRoutes.post('/investigations', async (c) => {
  const user = await resolveUser(c);
  const { workspaceId, sharedInvestigationId, accessorType, accessorId, canRead, canWrite } = await c.req.json().catch(() => ({}));

  if (!workspaceId || !sharedInvestigationId || !accessorType) {
    return c.json({ error: 'workspaceId, sharedInvestigationId, and accessorType are required' }, 400);
  }

  // Guard: check permission
  const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'INVESTIGATION', 'MANAGE');
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const access = await investigationSecurityManager.setInvestigationAccess(
    workspaceId,
    sharedInvestigationId,
    accessorType,
    accessorId,
    canRead,
    canWrite
  );

  return c.json({ access });
});

/**
 * GET /rbac/replays
 * Retrieves all replay visibility configurations
 */
rbacCoreRoutes.get('/replays', async (c) => {
  const user = await resolveUser(c);
  const workspaceId = c.req.query('workspaceId');
  if (!workspaceId) return c.json({ error: 'workspaceId is required' }, 400);

  const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'REPLAY', 'READ');
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const scopes = await replayScopeManager.getReplayScopes(workspaceId);
  return c.json({ scopes });
});

/**
 * POST /rbac/replays
 * Updates replay visibility scope
 */
rbacCoreRoutes.post('/replays', async (c) => {
  const user = await resolveUser(c);
  const { workspaceId, workflowSessionId, scopeType, allowedRoles } = await c.req.json().catch(() => ({}));

  if (!workspaceId || !workflowSessionId || !scopeType) {
    return c.json({ error: 'workspaceId, workflowSessionId, and scopeType are required' }, 400);
  }

  // Guard: check permission
  const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'REPLAY', 'MANAGE');
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const scope = await replayScopeManager.setReplayScope(
    workspaceId,
    workflowSessionId,
    scopeType,
    allowedRoles || []
  );

  // Broadcast
  RealtimeEventBus.getInstance().publish({
    orchestrationSessionId: workspaceId,
    eventType: 'workspace.replay-sync.updated',
    payload: { workspaceId, workflowSessionId, scopeType, allowedRoles },
  });

  return c.json({ scope });
});

/**
 * GET /rbac/security
 * Returns security audit logs timeline
 */
rbacCoreRoutes.get('/security', async (c) => {
  const user = await resolveUser(c);
  const workspaceId = c.req.query('workspaceId');
  if (!workspaceId) return c.json({ error: 'workspaceId query parameter is required' }, 400);

  const hasPerm = await guard.checkWorkspacePermission(user?.id, workspaceId, 'TEAM', 'READ');
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const logs = await auditLogger.getSecurityEvents(workspaceId);
  return c.json({ logs });
});
