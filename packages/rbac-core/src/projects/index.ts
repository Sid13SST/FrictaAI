import { PrismaClient } from '@fricta/db';

export class WorkspaceProjectScopeManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Verifies if a project is linked to the workspace.
   * If workspaceId is null, returns true (Solo Mode fallback).
   */
  async isProjectInScope(projectId: string, workspaceId?: string | null): Promise<boolean> {
    if (!workspaceId) {
      return true; // Solo Mode
    }

    const link = await this.prisma.workspaceProject.findFirst({
      where: {
        workspaceId,
        projectId,
      },
    });

    return !!link;
  }

  /**
   * Scopes projects list query based on workspace.
   */
  async getScopedProjects(workspaceId?: string | null) {
    if (!workspaceId) {
      // Return all projects that are NOT linked to any workspace (Solo Mode)
      return this.prisma.project.findMany({
        where: { workspaceId: null },
      });
    }

    // Return projects scoped to this workspace
    return this.prisma.project.findMany({
      where: {
        workspaceProjects: {
          some: { workspaceId },
        },
      },
    });
  }
}
