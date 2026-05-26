import { PrismaClient } from '@fricta/db';

export class WorkspaceManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Creates a new workspace under an organization.
   */
  async createWorkspace(organizationId: string, name: string, description?: string) {
    if (!name || name.trim() === '') {
      throw new Error('Workspace name cannot be empty');
    }

    return this.prisma.workspace.create({
      data: {
        organizationId,
        name,
        description,
      },
    });
  }

  /**
   * Retrieves all workspaces associated with a user's memberships.
   */
  async getUserWorkspaces(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      select: {
        workspace: {
          include: {
            organization: true,
          },
        },
      },
    });

    return memberships
      .map((m) => m.workspace)
      .filter((ws): ws is NonNullable<typeof ws> => ws !== null);
  }

  /**
   * Returns workspace details including organization branding.
   */
  async getWorkspaceDetails(workspaceId: string) {
    return this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        organization: true,
      },
    });
  }
}
