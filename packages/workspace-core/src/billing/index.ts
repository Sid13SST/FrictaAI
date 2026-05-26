import { PrismaClient } from '@fricta/db';
import { WorkspaceBillingLimits } from '../types';

export class BillingLimitManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Evaluates limits and current usage for an organization.
   */
  async getBillingLimits(organizationId: string): Promise<WorkspaceBillingLimits> {
    // Check organization membership counts
    const membersCount = await this.prisma.workspaceMember.count({
      where: { organizationId },
    });

    const workspacesCount = await this.prisma.workspace.count({
      where: { organizationId },
    });

    // Count workspace projects
    const workspaces = await this.prisma.workspace.findMany({
      where: { organizationId },
      select: { id: true },
    });
    const workspaceIds = workspaces.map((w) => w.id);
    const projectsCount = await this.prisma.workspaceProject.count({
      where: { workspaceId: { in: workspaceIds } },
    });

    // Default tier is FREE, can be upgraded to GROWTH or ENTERPRISE
    const getTier = (): 'FREE' | 'GROWTH' | 'ENTERPRISE' => 'FREE';
    const tier = getTier();

    let maxMembers = 5;
    let maxWorkspaces = 2;
    let maxProjects = 3;

    if (tier === 'GROWTH') {
      maxMembers = 25;
      maxWorkspaces = 10;
      maxProjects = 15;
    } else if (tier === 'ENTERPRISE') {
      maxMembers = 1000;
      maxWorkspaces = 100;
      maxProjects = 500;
    }

    return {
      maxMembers,
      maxWorkspaces,
      maxProjects,
      currentMembers: membersCount,
      currentWorkspaces: workspacesCount,
      currentProjects: projectsCount,
      tier,
    };
  }

  /**
   * Asserts whether a member invite/creation can proceed based on billing limits.
   */
  async canAddMember(organizationId: string): Promise<boolean> {
    const limits = await this.getBillingLimits(organizationId);
    return limits.currentMembers < limits.maxMembers;
  }

  /**
   * Asserts whether a new workspace can be created under an organization.
   */
  async canCreateWorkspace(organizationId: string): Promise<boolean> {
    const limits = await this.getBillingLimits(organizationId);
    return limits.currentWorkspaces < limits.maxWorkspaces;
  }
}
