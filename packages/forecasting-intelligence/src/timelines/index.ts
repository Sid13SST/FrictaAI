import { prisma } from '@fricta/db';

export class ForecastTimelineExplorer {
  static async getTimelineProjections(projectId: string) {
    const forecasts = await prisma.forecastRecord.findMany({
      where: { projectId },
      orderBy: { targetDate: 'asc' }
    });

    const snapshots = await prisma.forecastSnapshot.findMany({
      where: { projectId },
      orderBy: { recordedAt: 'desc' },
      take: 10
    });

    const timelineEvents = [];

    // Add forecast milestones
    for (const f of forecasts) {
      timelineEvents.push({
        id: `forecast-${f.id}`,
        eventType: 'FORECAST_MILESTONE',
        title: `Projected target for ${f.targetEntityName}`,
        description: `Expected path reaches ${f.projectedValue} (Bounds: ${f.lowerBound} - ${f.upperBound}) under ${f.forecastType} forecast. Confidence: ${Math.round(f.confidence * 100)}%.`,
        timestamp: f.targetDate
      });
    }

    // Add snapshot audit histories
    for (const s of snapshots) {
      timelineEvents.push({
        id: `snap-${s.id}`,
        eventType: 'AUDIT_SNAPSHOT',
        title: 'Forecast State snapshot captured',
        description: `Snapshot details: ${s.forecastCount} forecasts tracked, ${s.riskCount} emerging risks documented.`,
        timestamp: s.recordedAt
      });
    }

    // Sort all timeline events by timestamp
    return timelineEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
}
