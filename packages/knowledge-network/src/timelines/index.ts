import { prisma } from '@fricta/db';

export class GraphTimelineManager {
  static async getGraphTimeline(projectId: string) {
    const events = await prisma.knowledgeTimeline.findMany({
      where: { projectId },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    return events;
  }
}
