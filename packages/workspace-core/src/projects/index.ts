import { PrismaClient } from '@fricta/db';

export class ProjectWorkspaceManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Retrieves all projects assigned to a workspace.
   */
  async getWorkspaceProjects(workspaceId: string) {
    return this.prisma.project.findMany({
      where: {
        OR: [
          { workspaceId },
          {
            workspaceProjects: {
              some: { workspaceId },
            },
          },
        ],
      },
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
   * Links or transfers a project to a workspace.
   */
  async transferProjectToWorkspace(projectId: string, workspaceId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Update Project directly
      const project = await tx.project.update({
        where: { id: projectId },
        data: { workspaceId },
      });

      // 2. Insert or check join table WorkspaceProject
      const existingJoin = await tx.workspaceProject.findFirst({
        where: { projectId, workspaceId },
      });

      if (!existingJoin) {
        await tx.workspaceProject.create({
          data: {
            projectId,
            workspaceId,
          },
        });
      }

      // 3. Log workspace activity
      await tx.workspaceActivity.create({
        data: {
          workspaceId,
          userId,
          actionType: 'PROJECT_ADDED',
          description: `Project "${project.projectName}" was linked to workspace`,
          metadata: { projectId },
        },
      });

      return project;
    });
  }

  /**
   * Removes a project from a workspace, returning it to standalone/solo status.
   */
  async removeProjectFromWorkspace(projectId: string, workspaceId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Unlink Project workspaceId
      const project = await tx.project.update({
        where: { id: projectId },
        data: { workspaceId: null },
      });

      // 2. Remove join records
      await tx.workspaceProject.deleteMany({
        where: { projectId, workspaceId },
      });

      // 3. Log activity
      await tx.workspaceActivity.create({
        data: {
          workspaceId,
          userId,
          actionType: 'PROJECT_REMOVED',
          description: `Project "${project.projectName}" was unlinked from workspace`,
          metadata: { projectId },
        },
      });

      return project;
    });
  }
}
