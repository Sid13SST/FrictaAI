import { prisma } from '@fricta/db';

export class EngineeringObservability {
  /**
   * Fetch a summary of active risk events and build correlations for a project.
   */
  static async getObservabilitySummary(projectId: string): Promise<any> {
    const runs = await prisma.deploymentRun.findMany({
      where: { projectId },
      include: {
        riskSignals: true,
        buildCorrelations: true,
        regressions: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const timeline = await prisma.releaseTimelineEvent.findMany({
      where: {
        deploymentRun: { projectId }
      },
      orderBy: { timestamp: 'desc' },
      take: 20
    });

    return {
      recentRuns: runs,
      timeline
    };
  }
}
