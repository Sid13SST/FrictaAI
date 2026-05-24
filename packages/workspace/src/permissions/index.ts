import { PrismaClient } from '@fricta/db';
import { WorkspaceAction, WorkspaceRole } from '../types';

export class PermissionManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Evaluates if a user has permission to perform an action on a workspace/project.
   * If the project is standalone (workspaceId is null), it defaults to true.
   */
  async checkPermission(
    userId: string,
    action: WorkspaceAction,
    options: { workspaceId?: string; projectId?: string }
  ): Promise<boolean> {
    const { workspaceId, projectId } = options;

    // 1. Standalone fallback: If no workspace scoping, solo modes are fully permitted.
    if (!workspaceId && !projectId) {
      return true;
    }

    let targetWorkspaceId = workspaceId;

    if (projectId && !targetWorkspaceId) {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { workspaceId: true },
      });
      
      // If the project doesn't belong to a workspace, it's a solo project.
      if (!project || !project.workspaceId) {
        return true;
      }
      targetWorkspaceId = project.workspaceId;
    }

    if (!targetWorkspaceId) {
      return true;
    }

    // 2. Fetch the user's membership within the workspace
    const member = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId: targetWorkspaceId,
        userId,
      },
    });

    if (!member) {
      return false; // Not a member of the workspace
    }

    const role = member.role as WorkspaceRole;

    // 3. Evaluate explicit database PermissionGrant overrides first
    const explicitGrant = await this.prisma.permissionGrant.findFirst({
      where: {
        memberId: member.id,
        action,
      },
    });

    if (explicitGrant !== null) {
      return explicitGrant.isAllowed;
    }

    // 4. Default RBAC Role Actions
    return this.evaluateRbac(role, action);
  }

  private evaluateRbac(role: WorkspaceRole, action: WorkspaceAction): boolean {
    // OWNER and ADMIN bypass all restrictions
    if (role === 'OWNER' || role === 'ADMIN') {
      return true;
    }

    switch (action) {
      case 'READ_WORKSPACE':
        return true; // Everyone who is a member can read
        
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
        return false; // Only OWNER/ADMIN can manage members

      default:
        return false;
    }
  }
}
