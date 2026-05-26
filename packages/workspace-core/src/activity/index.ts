import { PrismaClient } from '@fricta/db';

export class ActivityLogManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Logs an action to the workspace activity timeline.
   */
  async logActivity(
    workspaceId: string,
    userId: string,
    actionType: string,
    description: string,
    metadata?: any
  ) {
    return this.prisma.workspaceActivity.create({
      data: {
        workspaceId,
        userId,
        actionType,
        description,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
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
   * Retrieves workspace activities with member details.
   */
  async getWorkspaceActivities(workspaceId: string, limit = 50) {
    const activities = await this.prisma.workspaceActivity.findMany({
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
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return activities.map((act) => {
      let parsedMeta = act.metadata;
      if (typeof act.metadata === 'string') {
        try {
          parsedMeta = JSON.parse(act.metadata);
        } catch {
          // fallback
        }
      }
      return {
        id: act.id,
        workspaceId: act.workspaceId,
        userId: act.userId,
        userName: act.user?.name || act.user?.email || 'System User',
        actionType: act.actionType,
        description: act.description,
        metadata: parsedMeta,
        createdAt: act.createdAt,
      };
    });
  }
}
