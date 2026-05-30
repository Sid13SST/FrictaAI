import { prisma } from '@fricta/db';
import type { MetricSnapshot } from '../types';

// ─── UX Metrics Collector ─────────────────────────────────────────────────────
// Snapshots current project metrics to create pre-experiment baselines.
// Diffs two snapshots to compute improvement/regression deltas.

export class UXMetricsCollector {
  /**
   * Collect a snapshot of current UX metrics for a project.
   * Derives values from survivability metrics and anomalies.
   */
  static async collectBaseline(projectId: string, experimentId?: string, scopeKey?: string): Promise<MetricSnapshot[]> {
    const snapshots: MetricSnapshot[] = [];
    const now = new Date();

    // Pull survivability metrics (individual rows by metricType)
    const survRows = await prisma.survivabilityMetric.findMany({
      where: { projectId },
      orderBy: { timestamp: 'desc' },
      take: 20,
    });

    // Group by metricType, use latest value per type
    const survMap = new Map<string, number>();
    for (const row of survRows) {
      if (!survMap.has(row.metricType)) survMap.set(row.metricType, row.value);
    }

    // Map standard metric types to snapshot names
    const metricNameMap: Record<string, string> = {
      ONBOARDING_SURVIVABILITY:  'onboarding_survivability',
      CHECKOUT_SURVIVABILITY:    'checkout_survivability',
      WORKFLOW_SURVIVABILITY:    'workflow_survivability',
      CTA_SURVIVABILITY:         'cta_survivability',
      NAVIGATION_SURVIVABILITY:  'navigation_survivability',
      COGNITIVE_SURVIVABILITY:   'cognitive_survivability',
    };

    for (const [type, name] of Object.entries(metricNameMap)) {
      const value = survMap.get(type);
      if (value !== undefined) {
        snapshots.push({ metricName: name, value, capturedAt: now, scopeKey });
      }
    }

    // Pull anomaly counts
    const anomalyCount = await prisma.uXAnomaly.count({ where: { projectId, isResolved: false } });
    const rageClicks   = await prisma.uXAnomaly.count({ where: { projectId, anomalyType: 'RAGE_CLICK_SPIKE', isResolved: false } });

    snapshots.push({ metricName: 'active_anomaly_count', value: anomalyCount, capturedAt: now, scopeKey });
    snapshots.push({ metricName: 'rage_click_rate',      value: anomalyCount > 0 ? rageClicks / anomalyCount : 0, capturedAt: now, scopeKey });

    // Persist baselines if experimentId provided
    if (experimentId) {
      await prisma.improvementBaseline.createMany({
        data: snapshots.map((s) => ({
          projectId,
          experimentId,
          metricName:    s.metricName,
          baselineValue: s.value,
          capturedAt:    s.capturedAt,
          scopeKey:      s.scopeKey,
        })),
        skipDuplicates: true,
      });
    }

    return snapshots;
  }

  /**
   * Compute the delta between two metric snapshots.
   * Returns a map of metricName -> deltaPercent.
   */
  static diff(
    baseline: MetricSnapshot[],
    current:  MetricSnapshot[]
  ): Record<string, number> {
    const baseMap = new Map(baseline.map((s) => [s.metricName, s.value]));
    const result: Record<string, number> = {};

    for (const snap of current) {
      const base = baseMap.get(snap.metricName);
      if (base !== undefined && base !== 0) {
        result[snap.metricName] = ((snap.value - base) / base) * 100;
      }
    }

    return result;
  }
}
