import type { ComparisonResult } from '../types';

// ─── Comparison Engine ────────────────────────────────────────────────────────
// Side-by-side metric comparison between experiment variants.
// Detects unexpected consequences in non-target metrics.

const LOWER_IS_BETTER = new Set([
  'rage_click_rate', 'friction_score', 'abandonment_rate',
  'error_rate', 'hesitation_score', 'active_anomaly_count',
]);

export class ComparisonEngine {
  /**
   * Compare two metric snapshots side-by-side.
   * Determines improvement direction based on metric semantics.
   */
  static compareVariants(
    baseline:     Record<string, number>,
    variant:      Record<string, number>,
    targetMetric: string
  ): ComparisonResult[] {
    const results: ComparisonResult[] = [];

    const allMetrics = new Set([...Object.keys(baseline), ...Object.keys(variant)]);

    for (const metric of allMetrics) {
      const baselineValue = baseline[metric] ?? 0;
      const currentValue  = variant[metric]  ?? 0;
      const deltaPercent  = baselineValue !== 0
        ? ((currentValue - baselineValue) / baselineValue) * 100
        : 0;

      const isTarget     = metric === targetMetric;
      const lowerBetter  = LOWER_IS_BETTER.has(metric);

      const improved = lowerBetter ? deltaPercent < -2 : deltaPercent > 2;
      const regressed = lowerBetter ? deltaPercent > 2  : deltaPercent < -2;

      const direction: 'IMPROVED' | 'REGRESSED' | 'NEUTRAL' =
        improved  ? 'IMPROVED'  :
        regressed ? 'REGRESSED' : 'NEUTRAL';

      // Flag unexpected consequence: non-target metric regressed
      const isUnexpected = !isTarget && direction === 'REGRESSED' && Math.abs(deltaPercent) > 10;

      results.push({ metricName: metric, baselineValue, currentValue, deltaPercent, direction, isUnexpected });
    }

    return results;
  }

  /**
   * Return only the metrics where an unexpected regression was detected.
   */
  static detectUnexpectedConsequences(comparisons: ComparisonResult[]): ComparisonResult[] {
    return comparisons.filter((c) => c.isUnexpected);
  }
}
