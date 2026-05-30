import { BaselineManager } from '../baselines';

export interface ThresholdResult {
  isAnomalous: boolean;
  expected: number;
  standardDeviation: number;
  multiplier: number;
  deviationAmount: number;
  explanation: string;
}

export class ThresholdValidator {
  /**
   * Compares a real-time metric value to its historical or version-specific baseline.
   * Flagged if: currentValue > expectedValue + (stdDevMultiplier * standardDeviation).
   */
  public static async evaluateMetric(
    projectId: string,
    metricName: string,
    currentValue: number,
    scopeKey: string,
    options?: {
      baselineType?: string;
      stdDevMultiplier?: number;
      staticFallbackThreshold?: number;
    }
  ): Promise<ThresholdResult> {
    const baselineType = options?.baselineType || 'VERSION';
    const stdDevMultiplier = options?.stdDevMultiplier !== undefined ? options.stdDevMultiplier : 3.0;

    // 1. Fetch active baseline limits
    const { expectedValue, standardDeviation } = await BaselineManager.getBaseline(
      projectId,
      metricName,
      baselineType,
      scopeKey
    );

    // 2. Evaluate deviation
    const thresholdLimit = expectedValue + stdDevMultiplier * standardDeviation;
    const isAnomalous = currentValue > thresholdLimit;
    const deviationAmount = currentValue - expectedValue;

    let explanation = '';
    if (isAnomalous) {
      explanation = `Metric [${metricName}] is anomalous. Current rate of ${currentValue.toFixed(4)} exceeded baseline rate of ${expectedValue.toFixed(4)} by ${(deviationAmount / (standardDeviation || 1)).toFixed(1)} standard deviations (threshold limit: ${thresholdLimit.toFixed(4)}).`;
    } else {
      explanation = `Metric [${metricName}] of ${currentValue.toFixed(4)} is within healthy parameters (baseline: ${expectedValue.toFixed(4)}, limit: ${thresholdLimit.toFixed(4)}).`;
    }

    return {
      isAnomalous,
      expected: expectedValue,
      standardDeviation,
      multiplier: stdDevMultiplier,
      deviationAmount,
      explanation,
    };
  }
}
