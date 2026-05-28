import { prisma } from '@fricta/db';
import { UXMemorySnapshotSummary } from '../types';

export class UXMemoryEngine {
  /**
   * Compiles and creates a persistent memory checkpoint snapshot.
   */
  static async captureMemorySnapshot(projectId: string, workspaceId: string | null, snapshotName: string): Promise<UXMemorySnapshotSummary> {
    // 1. Gather count stats
    const patterns = await prisma.crossSessionPattern.findMany({
      where: { projectId }
    });

    const regressions = await prisma.historicalRegression.findMany({
      where: { projectId }
    });

    const trends = await prisma.organizationalTrend.findMany({
      where: { workspaceId },
      orderBy: { timestamp: 'desc' },
      take: 1
    });

    const health = trends[0]?.scoreValue || 85;

    // 2. Create memory snap
    const snap = await prisma.uXMemorySnapshot.create({
      data: {
        workspaceId,
        projectId,
        snapshotName,
        summary: `UX Memory snapshot captured at ${new Date().toISOString()}. Contains ${patterns.length} persistent patterns and ${regressions.length} degradation regressions.`,
        patternCount: patterns.length,
        activeRiskCount: regressions.length,
        trendHealth: health
      }
    });

    return {
      snapshotName: snap.snapshotName,
      summary: snap.summary,
      patternCount: snap.patternCount,
      activeRiskCount: snap.activeRiskCount,
      trendHealth: snap.trendHealth
    };
  }

  /**
   * Fetches active snapshots.
   */
  static async getMemorySnapshots(projectId: string, workspaceId: string | null) {
    return prisma.uXMemorySnapshot.findMany({
      where: {
        projectId,
        workspaceId
      },
      orderBy: { capturedAt: 'desc' }
    });
  }
}
