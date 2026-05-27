import { PrismaClient } from '@fricta/db';
import { RBACRoleName } from '../types';

export class WorkspaceRoleManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Returns all roles available in a workspace, merging global/default ones and custom ones.
   */
  async getRoles(workspaceId: string) {
    const customRoles = await this.prisma.workspaceRole.findMany({
      where: { workspaceId },
      include: { permissions: true },
    });

    // Default built-in roles
    const builtInRoles = [
      { id: 'default-owner', name: 'OWNER', description: 'Full organization and workspace ownership.', permissions: [] },
      { id: 'default-admin', name: 'ADMIN', description: 'Full operational administration access.', permissions: [] },
      { id: 'default-analyst', name: 'ANALYST', description: 'Can investigate, replay, analyze and annotate.', permissions: [] },
      { id: 'default-viewer', name: 'VIEWER', description: 'Read-only access to workspaces, analytics and replays.', permissions: [] },
      { id: 'default-guest', name: 'GUEST', description: 'Scoped access to shared investigations only.', permissions: [] },
    ];

    return [...builtInRoles, ...customRoles];
  }

  /**
   * Creates or updates a custom role in a workspace
   */
  async upsertCustomRole(
    workspaceId: string,
    roleName: string,
    description: string,
    permissions: Array<{ domain: string; action: string; isAllowed: boolean }>
  ) {
    const nameUpper = roleName.toUpperCase();
    if (['OWNER', 'ADMIN', 'ANALYST', 'VIEWER', 'GUEST'].includes(nameUpper)) {
      throw new Error(`Cannot override built-in default role: ${roleName}`);
    }

    // Check if role exists
    const existing = await this.prisma.workspaceRole.findFirst({
      where: { workspaceId, name: nameUpper },
    });

    let role;
    if (existing) {
      // Update description
      role = await this.prisma.workspaceRole.update({
        where: { id: existing.id },
        data: { description },
      });

      // Re-create permissions
      await this.prisma.workspacePermission.deleteMany({
        where: { roleId: role.id },
      });
    } else {
      role = await this.prisma.workspaceRole.create({
        data: {
          workspaceId,
          name: nameUpper,
          description,
        },
      });
    }

    // Insert permissions
    if (permissions && permissions.length > 0) {
      await this.prisma.workspacePermission.createMany({
        data: permissions.map((p) => ({
          roleId: role.id,
          domain: p.domain,
          action: p.action,
          isAllowed: p.isAllowed,
        })),
      });
    }

    return this.prisma.workspaceRole.findUnique({
      where: { id: role.id },
      include: { permissions: true },
    });
  }

  /**
   * Deletes a custom role
   */
  async deleteCustomRole(workspaceId: string, roleId: string) {
    const role = await this.prisma.workspaceRole.findUnique({
      where: { id: roleId },
    });

    if (!role) throw new Error('Role not found');
    if (role.workspaceId !== workspaceId) throw new Error('Forbidden: Role belongs to another workspace');
    if (['OWNER', 'ADMIN', 'ANALYST', 'VIEWER', 'GUEST'].includes(role.name)) {
      throw new Error('Cannot delete built-in system role');
    }

    await this.prisma.workspaceRole.delete({
      where: { id: roleId },
    });

    return { success: true };
  }
}
