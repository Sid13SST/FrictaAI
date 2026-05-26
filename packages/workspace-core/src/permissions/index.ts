import { PrismaClient } from '@fricta/db';
import { WorkspaceAction, WorkspaceRole } from '../types';

export class PermissionManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Evaluates if a user has permission to perform an action on a workspace/project.
   * Standalone solo mode checks default to true.
   */
  async checkPermission(
    userId: string,
    action: WorkspaceAction,
    options: { workspaceId?: string; projectId?: string }
  ): Promise<boolean> {
    const { workspaceId, projectId } = options;

    if (!workspaceId && !projectId) {
      return true;
    }

    let targetWorkspaceId = workspaceId;

    if (projectId && !targetWorkspaceId) {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { workspaceId: true },
      });
      
      if (!project || !project.workspaceId) {
        return true;
      }
      targetWorkspaceId = project.workspaceId;
    }

    if (!targetWorkspaceId) {
      return true;
    }

    const member = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId: targetWorkspaceId,
        userId,
      },
    });

    if (!member) {
      return false;
    }

    const role = member.role as WorkspaceRole;

    const explicitGrant = await this.prisma.permissionGrant.findFirst({
      where: {
        memberId: member.id,
        action,
      },
    });

    if (explicitGrant !== null) {
      return explicitGrant.isAllowed;
    }

    return this.evaluateRbac(role, action);
  }

  private evaluateRbac(role: WorkspaceRole, action: WorkspaceAction): boolean {
    if (role === 'OWNER' || role === 'ADMIN') {
      return true;
    }

    switch (action) {
      case 'READ_WORKSPACE':
        return true;
        
      case 'VIEW_AUDIT_LOGS':
        return ['UX_LEAD', 'INVESTIGATOR', 'REVIEWER'].includes(role);

      case 'RUN_INVESTIGATION':
        return ['UX_LEAD', 'INVESTIGATOR'].includes(role);

      case 'WRITE_ANNOTATION':
        return ['UX_LEAD', 'INVESTIGATOR', 'REVIEWER'].includes(role);

      case 'MANAGE_REVIEWS':
        return ['UX_LEAD', 'INVESTIGATOR', 'REVIEWER'].includes(role);

      case 'SHARE_INTELLIGENCE':
        return ['UX_LEAD', 'INVESTIGATOR'].includes(role);

      case 'MANAGE_GOVERNANCE':
        return ['UX_LEAD'].includes(role);

      case 'MANAGE_MEMBERS':
        return false;

      default:
        return false;
    }
  }
}
