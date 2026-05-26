import { PrismaClient } from '@fricta/db';
import { OrganizationBranding } from '../types';

export class OrganizationManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Creates an Organization, a default main workspace, and configures an owner role.
   */
  async createOrganization(name: string, ownerUserId: string) {
    if (!name || name.trim() === '') {
      throw new Error('Organization name cannot be empty');
    }

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
   * Validates and updates organization branding.
   */
  async updateBranding(organizationId: string, branding: OrganizationBranding) {
    if (!branding.companyName || branding.companyName.trim() === '') {
      throw new Error('Company name is required for branding');
    }

    if (branding.primaryColor && !/^#([0-9A-F]{3}){1,2}$/i.test(branding.primaryColor)) {
      throw new Error('Invalid primary hex color code');
    }

    if (branding.logoUrl && !branding.logoUrl.startsWith('http://') && !branding.logoUrl.startsWith('https://')) {
      throw new Error('Logo URL must be a valid HTTP or HTTPS address');
    }

    return this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: branding.companyName,
      },
    });
  }

  async getOrganization(id: string) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: {
        workspaces: true,
      },
    });
  }

  async listAllOrganizations() {
    return this.prisma.organization.findMany({
      include: {
        workspaces: true,
      },
    });
  }
}
