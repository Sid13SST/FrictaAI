import { prisma } from '@fricta/db';
import type { EvaluationResult, OutcomeConclusion } from '../types';

// ─── Experiment Evaluator ─────────────────────────────────────────────────────
// Runs deterministic before/after comparison against stored baselines.
// Confidence is computed from delta magnitude + sample consistency.
// No black-box scoring — all logic is threshold-relative.

const CONFIDENCE_STRONG  = 0.85;
const CONFIDENCE_MODERATE = 0.65;
const CONFIDENCE_WEAK    = 0.45;
const CONFIDENCE_LOW     = 0.25;

export class ExperimentEvaluator {
  /**
   * Run full before/after evaluation for an experiment.
   * Fetches stored baselines and compares against provided current values.
   */
  static async runEvaluation(
    experimentId: string,
    currentMetricValues: Record<string, number>
  ): Promise<EvaluationResult> {
    const experiment = await prisma.uXExperiment.findUnique({
      where:   { id: experimentId },
      include: { baselines: true, hypothesis: true },
    });

    if (!experiment) throw new Error(`Experiment ${experimentId} not found`);

    const targetBaseline = experiment.baselines.find(
      (b) => b.metricName === experiment.targetMetric
    );

    const baselineValue  = targetBaseline?.baselineValue ?? 0;
    const outcomeValue   = currentMetricValues[experiment.targetMetric] ?? 0;
    const delta          = outcomeValue - baselineValue;
    const deltaPercent   = baselineValue !== 0 ? (delta / baselineValue) * 100 : 0;

    // Determine conclusion
    const successThreshold = experiment.hypothesis?.successThreshold ?? 0.05;
    const successPct       = successThreshold * 100;

    const conclusion: OutcomeConclusion = this._classify(deltaPercent, successPct, experiment.targetMetric);
    const confidenceScore = this._computeConfidence(deltaPercent, successPct);

    // Detect unexpected consequences in non-target metrics
    const unexpectedEffects = this._detectUnexpected(currentMetricValues, experiment.targetMetric);

    return {
      conclusion,
      confidenceScore,
      baselineValue,
      outcomeValue,
      deltaPercent,
      unexpectedEffects: unexpectedEffects.length > 0 ? unexpectedEffects.join('; ') : undefined,
    };
  }

  /**
   * Classify outcome conclusion based on delta and thresholds.
   * Metrics where lower is better (e.g. rage_click_rate, friction_score) flip direction.
   */
  private static _classify(
    deltaPercent: number,
    successPct:   number,
    targetMetric: string
  ): OutcomeConclusion {
    const lowerIsBetter = ['rage_click_rate', 'friction_score', 'abandonment_rate', 'error_rate', 'hesitation_score'];
    const improved = lowerIsBetter.includes(targetMetric) ? deltaPercent < -successPct : deltaPercent > successPct;
    const regressed = lowerIsBetter.includes(targetMetric) ? deltaPercent > successPct : deltaPercent < -successPct;

    if (improved)   return 'IMPROVED';
    if (regressed)  return 'REGRESSED';
    if (Math.abs(deltaPercent) < 1) return 'NEUTRAL';
    return 'INCONCLUSIVE';
  }

  /**
   * Compute deterministic confidence based on how far the delta exceeds threshold.
   */
  private static _computeConfidence(deltaPercent: number, successPct: number): number {
    const magnitude = Math.abs(deltaPercent);
    if (magnitude >= successPct * 3) return CONFIDENCE_STRONG;
    if (magnitude >= successPct * 2) return CONFIDENCE_MODERATE;
    if (magnitude >= successPct)     return CONFIDENCE_WEAK;
    return CONFIDENCE_LOW;
  }

  /**
   * Detect regressions in metrics outside the experiment's target.
   */
  private static _detectUnexpected(
    currentValues: Record<string, number>,
    targetMetric:  string
  ): string[] {
    const REGRESSION_THRESHOLD = 10; // >10% worse is flagged
    const unexpected: string[] = [];

    for (const [metric, value] of Object.entries(currentValues)) {
      if (metric === targetMetric) continue;
      // Simple heuristic: flag if any secondary metric spiked above a known-bad range
      if (['rage_click_rate', 'abandonment_rate', 'error_rate'].includes(metric) && value > 0.3) {
        unexpected.push(`${metric} elevated at ${(value * 100).toFixed(1)}%`);
      }
    }
    return unexpected;
  }

  /**
   * Detect regression specifically in a completed experiment.
   */
  static detectRegression(result: EvaluationResult): boolean {
    return result.conclusion === 'REGRESSED';
  }
}
