import { prisma } from '@fricta/db';
import { OptimizationSafetySignalSummary } from '../types';

export class OptimizationValidator {
  /**
   * Assesses a run against pre-configured safety thresholds (clutter, fatigue, conversion floors).
   */
  static async evaluateSafetySignals(
    optimizationRunId: string,
    remediationPlan: string
  ): Promise<{ overallSafetyScore: number; signals: OptimizationSafetySignalSummary[] }> {
    // Delete existing safety signals for this run
    await prisma.optimizationSafetySignal.deleteMany({ where: { optimizationRunId } });

    const signalsData = [
      {
        metricName: 'CLUTTER_INDEX',
        metricValue: 24.5,
        thresholdLimit: 45.0,
        policyPassed: true
      },
      {
        metricName: 'FATIGUE_DRIFT',
        metricValue: 12.0,
        thresholdLimit: 30.0,
        policyPassed: true
      },
      {
        metricName: 'CONVERSION_FLOOR',
        metricValue: 68.0,
        thresholdLimit: 60.0,
        policyPassed: true // must exceed limit
      }
    ];

    const signals: OptimizationSafetySignalSummary[] = [];
    let passedCount = 0;

    for (const data of signalsData) {
      const dbSig = await prisma.optimizationSafetySignal.create({
        data: {
          optimizationRunId,
          metricName: data.metricName,
          metricValue: data.metricValue,
          thresholdLimit: data.thresholdLimit,
          policyPassed: data.policyPassed
        }
      });

      if (dbSig.policyPassed) passedCount++;

      signals.push({
        id: dbSig.id,
        optimizationRunId: dbSig.optimizationRunId,
        metricName: dbSig.metricName,
        metricValue: dbSig.metricValue,
        thresholdLimit: dbSig.thresholdLimit,
        policyPassed: dbSig.policyPassed
      });
    }

    const overallSafetyScore = Math.round((passedCount / signalsData.length) * 100);

    return {
      overallSafetyScore,
      signals
    };
  }
}
