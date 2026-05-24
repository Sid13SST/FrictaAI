import { PrismaClient } from '@fricta/db';

export class ActivityLogManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Logs an operational activity to the audit database.
   */
  async logActivity(
    userId: string,
    actionType: string,
    description: string,
    options: { projectId?: string; workspaceId?: string; metadata?: any } = {}
  ) {
    return this.prisma.activityEvent.create({
      data: {
        userId,
        actionType,
        description,
        projectId: options.projectId || null,
        workspaceId: options.workspaceId || null,
        metadata: options.metadata || null,
      },
    });
  }

  /**
   * Fetches the activity feed.
   */
  async getActivityFeed(options: { projectId?: string; workspaceId?: string; limit?: number }) {
    const { projectId, workspaceId, limit = 50 } = options;
    return this.prisma.activityEvent.findMany({
      where: {
        OR: [
          projectId ? { projectId } : {},
          workspaceId ? { workspaceId } : {},
        ].filter(cond => Object.keys(cond).length > 0) as any,
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
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
