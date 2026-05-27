import { PrismaClient } from '@fricta/db';

export class WorkspaceTenancyManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Resolves member's active role name in the workspace.
   * Returns null if user is not in workspace.
   */
  async resolveMemberRole(workspaceId: string, userId: string): Promise<string | null> {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });

    return member ? member.role : null;
  }

  /**
   * Checks if user belongs to workspace.
   */
  async isWorkspaceMember(workspaceId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });

    return !!member;
  }
}
