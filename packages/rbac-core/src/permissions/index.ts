import { PrismaClient } from '@fricta/db';
import { PermissionDomain, PermissionAction } from '../types';

export class RBACPermissionEvaluator {
  constructor(private prisma: PrismaClient) {}

  /**
   * Checks if user has a permission in workspace.
   * If workspaceId is null/undefined, it falls back to Solo Mode (returns true).
   */
  async checkPermission(
    userId: string,
    domain: PermissionDomain,
    action: PermissionAction,
    workspaceId?: string | null
  ): Promise<boolean> {
    // Solo mode fallback: no workspace = full access
    if (!workspaceId) {
      return true;
    }

    // Find the member record
    const member = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
      },
      include: {
        workspaceRole: {
          include: { permissions: true },
        },
      },
    });

    if (!member) {
      return false; // Not a member of the workspace
    }

    const roleName = member.role.toUpperCase();

    // 1. Owner & Admin have full permissions
    if (roleName === 'OWNER' || roleName === 'ADMIN') {
      return true;
    }

    // 2. Built-in Roles Evaluation
    if (roleName === 'ANALYST') {
      // Analysts can read/write investigations, replays, analytics, swarms, annotations
      // They cannot write to TEAM or WORKSPACE configs
      if (domain === 'TEAM' || domain === 'WORKSPACE') {
        return action === 'READ';
      }
      return true; // Full access to other domains
    }

    if (roleName === 'VIEWER') {
      // Viewers can only read
      return action === 'READ';
    }

    if (roleName === 'GUEST') {
      // Guests have read/write only on specific investigations, and read-only on replays
      if (domain === 'INVESTIGATION') {
        return action === 'READ' || action === 'WRITE';
      }
      if (domain === 'REPLAY') {
        return action === 'READ';
      }
      return false; // Deny everything else
    }

    // 3. Custom Role Evaluation
    if (member.workspaceRole) {
      const explicit = member.workspaceRole.permissions.find(
        (p) => p.domain === domain && p.action === action
      );
      if (explicit) {
        return explicit.isAllowed;
      }
    }

    // Default to deny
    return false;
  }
}
