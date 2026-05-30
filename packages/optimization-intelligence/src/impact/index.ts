import { prisma } from '@fricta/db';

// ─── Impact Analyzer ─────────────────────────────────────────────────────────
// Measures the UX impact of experiments and recommendations
// across survivability, cognitive friction, and workflow completion.
// All measurements are relative to stored baselines — fully deterministic.

export class ImpactAnalyzer {
  /**
   * Measure change in onboarding survivability for a project
   * relative to an experiment's stored baselines.
   */
  static async measureSurvivabilityChange(
    projectId:    string,
    experimentId: string
  ): Promise<{ before: number; after: number; delta: number; improved: boolean }> {
    const baselines = await prisma.improvementBaseline.findMany({
      where: { projectId, experimentId, metricName: 'onboarding_survivability' },
      orderBy: { capturedAt: 'asc' },
    });

    const current = await prisma.survivabilityMetric.findFirst({
      where:   { projectId, metricType: 'ONBOARDING_SURVIVABILITY' },
      orderBy: { timestamp: 'desc' },
    });

    const before = baselines[0]?.baselineValue ?? 0;
    const after  = current?.value ?? 0;
    const delta  = after - before;

    return { before, after, delta, improved: delta > 0 };
  }

  /**
   * Measure change in cognitive friction (active anomaly count as proxy).
   */
  static async measureCognitiveChange(
    projectId:    string,
    experimentId: string
  ): Promise<{ before: number; after: number; delta: number; improved: boolean }> {
    const baselines = await prisma.improvementBaseline.findMany({
      where: { projectId, experimentId, metricName: 'active_anomaly_count' },
      orderBy: { capturedAt: 'asc' },
    });

    const before = baselines[0]?.baselineValue ?? 0;
    const after  = await prisma.uXAnomaly.count({ where: { projectId, isResolved: false } });
    const delta  = after - before;

    // Lower is better for anomaly count
    return { before, after, delta, improved: delta < 0 };
  }

  /**
   * Measure change in workflow survivability.
   */
  static async measureWorkflowChange(
    projectId:    string,
    experimentId: string
  ): Promise<{ before: number; after: number; delta: number; improved: boolean }> {
    const baselines = await prisma.improvementBaseline.findMany({
      where: { projectId, experimentId, metricName: 'workflow_survivability' },
      orderBy: { capturedAt: 'asc' },
    });

    const current = await prisma.survivabilityMetric.findFirst({
      where:   { projectId, metricType: 'WORKFLOW_SURVIVABILITY' },
      orderBy: { timestamp: 'desc' },
    });

    const before = baselines[0]?.baselineValue ?? 0;
    const after  = current?.value ?? 0;
    const delta  = after - before;

    return { before, after, delta, improved: delta > 0 };
  }
}
