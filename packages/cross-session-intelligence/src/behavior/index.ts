import { prisma } from '@fricta/db';

export class LongtermBehaviorAnalyzer {
  /**
   * Evaluates long-term behavior patterns (click and hover coordinates) from historical swarm runs.
   */
  static async compileLongtermBehavior(projectId: string, workspaceId: string | null) {
    const heatmaps = await prisma.populationHeatmap.findMany({
      where: {
        swarmSession: {
          projectId
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // Merge coordinates
    const clicks: { x: number; y: number; weight: number }[] = [];
    const hovers: { x: number; y: number; weight: number }[] = [];

    // Query replay events for actual click/hover coordinates
    const replayEvents = await prisma.swarmReplayEvent.findMany({
      where: {
        execution: {
          swarmSession: {
            projectId
          }
        }
      },
      take: 200
    });

    for (const e of replayEvents) {
      if (e.coordinates && typeof e.coordinates === 'object') {
        const coords = e.coordinates as any;
        if (typeof coords.x === 'number' && typeof coords.y === 'number') {
          const pt = { x: coords.x, y: coords.y, weight: 1 };
          if (e.eventType === 'CLICK') {
            clicks.push(pt);
          } else if (e.eventType === 'HOVER') {
            hovers.push(pt);
          }
        }
      }
    }

    return {
      clicks: clicks.slice(0, 100),
      hovers: hovers.slice(0, 100),
      scanRatios: heatmaps.map((h) => ({
        timestamp: h.createdAt,
        ratio: h.averageHesitationMs > 0 ? h.clickCount / h.averageHesitationMs : 1.0
      }))
    };
  }
}
