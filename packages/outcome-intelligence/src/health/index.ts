import { prisma } from '@fricta/db';

export class HealthSummaryEngine {
  static async getConsolidatedHealth(projectId: string) {
    const snapshots = await prisma.productHealthScore.findMany({
      where: { projectId },
      orderBy: { recordedAt: 'desc' },
      take: 12
    });

    // Compute averages
    let productSum = 0;
    let uxSum = 0;
    let strategicSum = 0;
    const count = snapshots.length;

    for (const snap of snapshots) {
      productSum += snap.productScore;
      uxSum += snap.uxScore;
      strategicSum += snap.strategicScore;
    }

    return {
      history: snapshots,
      averages: {
        productScore: count > 0 ? productSum / count : 80.0,
        uxScore: count > 0 ? uxSum / count : 85.0,
        strategicScore: count > 0 ? strategicSum / count : 75.0
      }
    };
  }
}
