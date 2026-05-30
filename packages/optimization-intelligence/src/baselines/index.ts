import { prisma } from '@fricta/db';

// ─── Baseline Manager ─────────────────────────────────────────────────────────
// Captures pre-experiment metric snapshots and compares current state to them.

export class BaselineManager {
  /**
   * Snapshot stored baselines into a lookup map for an experiment.
   */
  static async snapshot(experimentId: string): Promise<Record<string, number>> {
    const rows = await prisma.improvementBaseline.findMany({
      where: { experimentId },
    });

    return Object.fromEntries(rows.map((r) => [r.metricName, r.baselineValue]));
  }

  /**
   * Compare current metrics to stored experiment baselines.
   * Returns deltas as percentage change per metric.
   */
  static async compare(
    experimentId:  string,
    currentValues: Record<string, number>
  ): Promise<Record<string, { baseline: number; current: number; deltaPercent: number }>> {
    const baselines = await this.snapshot(experimentId);
    const result: Record<string, { baseline: number; current: number; deltaPercent: number }> = {};

    for (const [metric, current] of Object.entries(currentValues)) {
      const baseline = baselines[metric];
      if (baseline !== undefined) {
        const deltaPercent = baseline !== 0 ? ((current - baseline) / baseline) * 100 : 0;
        result[metric] = { baseline, current, deltaPercent };
      }
    }

    return result;
  }

  /**
   * List all baselines for a project.
   */
  static async list(projectId: string) {
    return prisma.improvementBaseline.findMany({
      where:   { projectId },
      include: { experiment: true },
      orderBy: { capturedAt: 'desc' },
    });
  }
}
