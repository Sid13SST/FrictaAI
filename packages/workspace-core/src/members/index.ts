import { PrismaClient } from '@fricta/db';
import { WorkspaceRole } from '../types';

export class MemberManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Retrieves all members in a given workspace.
   */
  async getWorkspaceMembers(workspaceId: string) {
    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Adds or updates user membership role inside a workspace.
   */
  async addMemberToWorkspace(
    organizationId: string,
    workspaceId: string,
    userId: string,
    role: WorkspaceRole
  ) {
    const existing = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });

    if (existing) {
      return this.prisma.workspaceMember.update({
        where: { id: existing.id },
        data: { role },
      });
    }

    return this.prisma.workspaceMember.create({
      data: {
        organizationId,
        workspaceId,
        userId,
        role,
      },
    });
  }

  /**
   * Removes a member from a workspace.
   */
  async removeMemberFromWorkspace(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });

    if (!member) {
      throw new Error('Workspace membership not found');
    }

    if (member.role === 'OWNER') {
      // Check if there are other owners
      const otherOwners = await this.prisma.workspaceMember.count({
        where: {
          workspaceId,
          role: 'OWNER',
          id: { not: member.id },
        },
      });
      if (otherOwners === 0) {
        throw new Error('Cannot remove the sole owner of a workspace');
      }
    }

    return this.prisma.workspaceMember.delete({
      where: { id: member.id },
    });
  }

  /**
   * Updates a user's role in the workspace.
   */
  async updateMemberRole(workspaceId: string, memberId: string, role: WorkspaceRole) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.workspaceId !== workspaceId) {
      throw new Error('Workspace member not found');
    }

    return this.prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role },
    });
  }
}
