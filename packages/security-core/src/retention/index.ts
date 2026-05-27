import { prisma } from '@fricta/db';

export class RetentionService {
  /**
   * Applies data retention policy scoping on workspace objects (e.g. Session Replays, Reports).
   */
  static async applyRetentionPolicy(
    workspaceId: string | null,
    resourceType: 'REPLAY' | 'REPORT' | 'INVESTIGATION',
    resourceId: string,
    retentionDays: number,
    notes?: string
  ) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + retentionDays);

    // Create or update retention record
    const existing = await prisma.complianceRetentionRecord.findFirst({
      where: { workspaceId: workspaceId || null, resourceType, resourceId }
    });

    if (existing) {
      return prisma.complianceRetentionRecord.update({
        where: { id: existing.id },
        data: {
          retentionDays,
          expiresAt,
          status: 'ACTIVE',
          notes
        }
      });
    }

    return prisma.complianceRetentionRecord.create({
      data: {
        workspaceId: workspaceId || null,
        resourceType,
        resourceId,
        retentionDays,
        expiresAt,
        status: 'ACTIVE',
        notes
      }
    });
  }

  /**
   * Returns active data retention listings.
   */
  static async getRetentionRecords(workspaceId?: string | null) {
    return prisma.complianceRetentionRecord.findMany({
      where: workspaceId ? { workspaceId } : { workspaceId: null },
      orderBy: { expiresAt: 'asc' }
    });
  }
}
