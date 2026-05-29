import { prisma } from '@fricta/db';

export class ReleaseManager {
  /**
   * Log a production release event.
   */
  static async logReleaseEvent(
    deploymentRunId: string,
    eventTitle: string,
    description: string
  ): Promise<any> {
    return prisma.releaseTimelineEvent.create({
      data: {
        deploymentRunId,
        eventType: 'COMMIT',
        eventTitle,
        description
      }
    });
  }

  /**
   * Fetch release timeline events.
   */
  static async getTimelineEvents(projectId: string): Promise<any[]> {
    return prisma.releaseTimelineEvent.findMany({
      where: {
        deploymentRun: { projectId }
      },
      include: {
        deploymentRun: true
      },
      orderBy: { timestamp: 'desc' }
    });
  }
}
