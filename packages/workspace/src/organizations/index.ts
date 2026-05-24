import { PrismaClient } from '@fricta/db';
import { WorkspaceRole } from '../types';

export class OrganizationManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Creates an Organization, a default Workspace, and designates the owner.
   */
  async createOrganization(name: string, ownerUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name },
      });

      const ws = await tx.workspace.create({
        data: {
          organizationId: org.id,
          name: 'Main Workspace',
          description: `Primary workspace for ${name}`,
        },
      });

      const member = await tx.workspaceMember.create({
        data: {
          organizationId: org.id,
          workspaceId: ws.id,
          userId: ownerUserId,
          role: 'OWNER',
        },
      });

      return { organization: org, workspace: ws, member };
    });
  }

  /**
   * Creates a new workspace under an organization.
   */
  async createWorkspace(organizationId: string, name: string, description?: string) {
    return this.prisma.workspace.create({
      data: {
        organizationId,
        name,
        description,
      },
    });
  }

  /**
   * Creates a new collaborative team inside an organization.
   */
  async createTeam(organizationId: string, name: string, description?: string) {
    return this.prisma.team.create({
      data: {
        organizationId,
        name,
        description,
      },
    });
  }

  /**
   * Adds or updates a user membership role inside a workspace.
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
   * Lists all workspaces a user is affiliated with.
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
   * Lists all members of a workspace.
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
}
