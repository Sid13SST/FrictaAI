import { PrismaClient } from '@fricta/db';

export class ReplayScopeManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Sets or updates the access scope for a replay session
   */
  async setReplayScope(
    workspaceId: string,
    workflowSessionId: string,
    scopeType: 'WORKSPACE' | 'PROJECT' | 'PRIVATE' | 'PUBLIC',
    allowedRoles: string[] = ['OWNER', 'ADMIN', 'ANALYST']
  ) {
    const existing = await this.prisma.replayAccessScope.findFirst({
      where: { workspaceId, workflowSessionId },
    });

    if (existing) {
      return this.prisma.replayAccessScope.update({
        where: { id: existing.id },
        data: { scopeType, allowedRoles },
      });
    } else {
      return this.prisma.replayAccessScope.create({
        data: {
          workspaceId,
          workflowSessionId,
          scopeType,
          allowedRoles,
        },
      });
    }
  }

  /**
   * Validates if a user can view a replay session.
   * If session does not have any scope configurations, default to workspace-wide visibility.
   */
  async canViewReplay(
    workspaceId: string,
    workflowSessionId: string,
    userId: string
  ): Promise<boolean> {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });

    if (!member) return false;

    // Owners and Admins can always view
    if (member.role === 'OWNER' || member.role === 'ADMIN') {
      return true;
    }

    const scope = await this.prisma.replayAccessScope.findFirst({
      where: { workspaceId, workflowSessionId },
    });

    if (!scope) {
      // Default fallback: allow access to all members of workspace
      return true;
    }

    if (scope.scopeType === 'PUBLIC') {
      return true;
    }

    if (scope.scopeType === 'PRIVATE') {
      // Only owner and admin can view private replays
      return false;
    }

    // WORKSPACE or PROJECT scope: check role matching
    const allowedRolesList = (scope.allowedRoles as string[]) || ['OWNER', 'ADMIN', 'ANALYST'];
    return allowedRolesList.includes(member.role);
  }

  /**
   * List scopes configurations for a workspace
   */
  async getReplayScopes(workspaceId: string) {
    return this.prisma.replayAccessScope.findMany({
      where: { workspaceId },
    });
  }
}
