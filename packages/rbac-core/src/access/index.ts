import { PrismaClient } from '@fricta/db';

export class SharedAccessGrantManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Creates a shared access grant for external sharing or specific team members
   */
  async grantAccess(
    workspaceId: string,
    resourceType: 'INVESTIGATION' | 'REPLAY' | 'ANALYTICS',
    resourceId: string,
    options: { granteeId?: string; granteeEmail?: string; durationDays?: number }
  ) {
    const { granteeId, granteeEmail, durationDays } = options;

    let expiresAt: Date | null = null;
    if (durationDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);
    }

    return this.prisma.sharedAccessGrant.create({
      data: {
        workspaceId,
        resourceType,
        resourceId,
        granteeId: granteeId || null,
        granteeEmail: granteeEmail || null,
        expiresAt,
      },
    });
  }

  /**
   * Validates if a grant is active and not expired
   */
  async validateGrant(grantId: string): Promise<boolean> {
    const grant = await this.prisma.sharedAccessGrant.findUnique({
      where: { id: grantId },
    });

    if (!grant) return false;
    if (grant.expiresAt && new Date() > grant.expiresAt) {
      return false; // Expired
    }

    return true;
  }

  /**
   * Revokes access by deleting the grant
   */
  async revokeAccess(grantId: string) {
    await this.prisma.sharedAccessGrant.delete({
      where: { id: grantId },
    });

    return { success: true };
  }

  /**
   * Retrieves all active grants for a workspace
   */
  async getWorkspaceGrants(workspaceId: string) {
    return this.prisma.sharedAccessGrant.findMany({
      where: { workspaceId },
    });
  }
}
