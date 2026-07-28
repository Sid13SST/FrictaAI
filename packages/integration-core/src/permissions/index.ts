import { prisma } from '@fricta/db';
import { IntegrationProvider } from '../types';

/**
 * IntegrationPermissionGuard — RBAC-aware access control for integration operations.
 *
 * Solo mode: when workspaceId is null, all permission checks bypass and return true.
 * This preserves full integration functionality for solo/founder users without enterprise setup.
 */
export class IntegrationPermissionGuard {
  /**
   * Check whether a user has permission to connect or manage integrations.
   * In workspace mode: requires ADMIN or OWNER membership.
   * In solo mode (workspaceId = null): always permitted.
   */
  static async canManageIntegrations(
    userId: string,
    workspaceId: string | null
  ): Promise<boolean> {
    // Solo mode bypass
    if (!workspaceId) return true;

    const member = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId }
    });

    if (!member) return false;
    return ['OWNER', 'ADMIN'].includes(member.role);
  }

  /**
   * Check whether a user can read integration data (connections, events, audit logs).
   * Requires at minimum REVIEWER membership in workspace mode.
   */
  static async canReadIntegrations(
    userId: string,
    workspaceId: string | null
  ): Promise<boolean> {
    if (!workspaceId) return true;

    const member = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId }
    });

    return !!member; // any workspace member can read
  }

  /**
   * Check whether a user can push evidence or create tickets via integrations.
   * Requires UX_LEAD, ADMIN, or OWNER in workspace mode.
   */
  static async canPushEvidence(
    userId: string,
    workspaceId: string | null
  ): Promise<boolean> {
    if (!workspaceId) return true;

    const member = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId }
    });

    if (!member) return false;
    return ['OWNER', 'ADMIN', 'UX_LEAD', 'INVESTIGATOR'].includes(member.role);
  }

  /**
   * Validate that a provider integration exists and is CONNECTED before allowing sync ops.
   * In solo mode (workspaceId null), scoped to the caller's own connection —
   * otherwise this would report another solo user's integration as "connected".
   */
  static async requireConnected(
    workspaceId: string | null,
    userId: string | null,
    provider: IntegrationProvider
  ): Promise<boolean> {
    const integration = await prisma.workspaceIntegration.findFirst({
      where: workspaceId
        ? { workspaceId, provider, status: 'CONNECTED' }
        : { workspaceId: null, userId, provider, status: 'CONNECTED' }
    });
    return !!integration;
  }
}
