import { prisma } from '@fricta/db';

export class LongitudinalTimelineManager {
  /**
   * Generates a timeline of predicted risks across future sequential runs.
   */
  static async compileLongitudinalTimeline(projectId: string, workspaceId: string | null) {
    const forecasts = await prisma.workflowForecast.findMany({
      where: { projectId },
      include: {
        riskSignals: true,
        timelineEvents: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    if (forecasts.length === 0) {
      return [];
    }

    // Accumulate events
    const timeline = [];
    for (const f of forecasts) {
      for (const e of f.timelineEvents) {
        timeline.push({
          stepOffset: e.stepIndex,
          threatType: e.eventType,
          severity: e.predictedIntensity >= 0.7 ? 'CRITICAL' : 'WARNING',
          description: e.description,
          intensity: e.predictedIntensity,
          forecastId: f.id,
          createdAt: e.createdAt
        });
      }
    }

    return timeline.sort((a, b) => a.stepOffset - b.stepOffset);
  }
}
