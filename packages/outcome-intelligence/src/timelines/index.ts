import { prisma } from '@fricta/db';

export class OutcomeTimelineLogger {
  static async logEvent(projectId: string, title: string, description: string, type: string) {
    const firstUser = await prisma.user.findFirst();
    if (firstUser) {
      return prisma.activityEvent.create({
        data: {
          userId: firstUser.id,
          projectId,
          actionType: type,
          description: `${title}: ${description}`
        }
      });
    }
    return null;
  }

  static async getTimeline(projectId: string) {
    // Collate ProductOutcome evaluations and general activity logs
    const outcomes = await prisma.productOutcome.findMany({
      where: { projectId },
      orderBy: { evaluatedAt: 'desc' },
      take: 15
    });

    const timeline = outcomes.map((o) => ({
      id: o.id,
      timestamp: o.evaluatedAt,
      type: 'OUTCOME_EVALUATED',
      title: `Outcome Evaluated: ${o.title}`,
      description: `Verdict: ${o.verdict}. ${o.description}`
    }));

    return timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}
