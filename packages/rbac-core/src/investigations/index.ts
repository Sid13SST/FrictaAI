import { PrismaClient } from '@fricta/db';

export class WorkspaceInvestigationSecurityManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Configures visibility for a shared investigation
   */
  async setInvestigationAccess(
    workspaceId: string,
    sharedInvestigationId: string,
    accessorType: 'ROLE' | 'MEMBER' | 'PUBLIC',
    accessorId: string | null,
    canRead: boolean,
    canWrite: boolean
  ) {
    const existing = await this.prisma.investigationAccess.findFirst({
      where: {
        workspaceId,
        sharedInvestigationId,
        accessorType,
        accessorId,
      },
    });

    if (existing) {
      return this.prisma.investigationAccess.update({
        where: { id: existing.id },
        data: { canRead, canWrite },
      });
    } else {
      return this.prisma.investigationAccess.create({
        data: {
          workspaceId,
          sharedInvestigationId,
          accessorType,
          accessorId,
          canRead,
          canWrite,
        },
      });
    }
  }

  /**
   * Evaluates if a user has access to a shared investigation in a workspace.
   */
  async canAccessSharedInvestigation(
    workspaceId: string,
    sharedInvestigationId: string,
    userId: string,
    action: 'READ' | 'WRITE'
  ): Promise<boolean> {
    // 1. Get the workspace member details and role
    const member = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });

    if (!member) return false;

    // Owners and Admins have unrestricted access
    if (member.role === 'OWNER' || member.role === 'ADMIN') {
      return true;
    }

    // 2. Fetch all access grants for this investigation
    const grants = await this.prisma.investigationAccess.findMany({
      where: { workspaceId, sharedInvestigationId },
    });

    // If no explicit grants, default to ALLOW for all workspace members (collaborative mode)
    if (grants.length === 0) {
      return true;
    }

    // Check if there is an explicit grant for this member ID
    const memberGrant = grants.find((g) => g.accessorType === 'MEMBER' && g.accessorId === member.id);
    if (memberGrant) {
      return action === 'READ' ? memberGrant.canRead : memberGrant.canWrite;
    }

    // Check if there is an explicit grant for this role
    const roleGrant = grants.find((g) => g.accessorType === 'ROLE' && g.accessorId === member.role);
    if (roleGrant) {
      return action === 'READ' ? roleGrant.canRead : roleGrant.canWrite;
    }

    // Check for public grant
    const publicGrant = grants.find((g) => g.accessorType === 'PUBLIC');
    if (publicGrant) {
      return action === 'READ' ? publicGrant.canRead : publicGrant.canWrite;
    }

    return false;
  }
}
