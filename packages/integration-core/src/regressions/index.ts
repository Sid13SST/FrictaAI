import { prisma } from '@fricta/db';

export class RegressionEngine {
  /**
   * Run regression analysis comparing current run replay metrics to project baseline.
   */
  static async analyzeRegressions(
    deploymentRunId: string,
    workflowPath: string,
    currentMetrics: {
      survivabilityRate: number;
      cognitiveLoad: number;
      frictionScore: number;
      steps: number;
    }
  ): Promise<any[]> {
    const run = await prisma.deploymentRun.findUnique({
      where: { id: deploymentRunId }
    });

    if (!run) throw new Error('Deployment run not found');

    // Find historical baseline for this project & workflow path
    const baseline = await prisma.historicalBaseline.findFirst({
      where: { projectId: run.projectId, workflowPath }
    });

    const baseSuccess = baseline?.successRate ?? 85.0; // fallback default
    const baseCognitive = baseline?.cognitiveLoadAverage ?? 40.0;
    const baseSteps = baseline?.averageSteps ?? 6.0;

    const analyses: any[] = [];

    // Check 1: Success/Survivability Rate degradation
    if (currentMetrics.survivabilityRate < baseSuccess) {
      const delta = baseSuccess - currentMetrics.survivabilityRate;
      const severity = delta > 20 ? 'CRITICAL' : delta > 10 ? 'HIGH' : 'MEDIUM';

      const analysis = await prisma.regressionAnalysis.create({
        data: {
          deploymentRunId,
          workflowPath,
          metricName: 'SUCCESS_RATE',
          baseValue: baseSuccess,
          currentValue: currentMetrics.survivabilityRate,
          delta: -delta,
          severity,
          explanation: `Survivability rate fell by ${delta.toFixed(1)}% below the historical baseline of ${baseSuccess}%.`,
          escalated: severity === 'CRITICAL' || severity === 'HIGH'
        }
      });

      analyses.push(analysis);

      // Flag a deployment risk signal
      await prisma.deploymentRiskSignal.create({
        data: {
          deploymentRunId,
          riskType: 'ONBOARDING_REGRESSION',
          severity,
          description: `UX Survivability degradation on ${workflowPath}: ${currentMetrics.survivabilityRate}% (baseline: ${baseSuccess}%)`
        }
      });
    }

    // Check 2: Cognitive Load spike
    if (currentMetrics.cognitiveLoad > baseCognitive + 5) {
      const delta = currentMetrics.cognitiveLoad - baseCognitive;
      const severity = delta > 25 ? 'CRITICAL' : delta > 15 ? 'HIGH' : 'MEDIUM';

      const analysis = await prisma.regressionAnalysis.create({
        data: {
          deploymentRunId,
          workflowPath,
          metricName: 'COGNITIVE_LOAD',
          baseValue: baseCognitive,
          currentValue: currentMetrics.cognitiveLoad,
          delta,
          severity,
          explanation: `Cognitive load rose by ${delta.toFixed(1)}% above baseline average of ${baseCognitive}%.`,
          escalated: severity === 'CRITICAL' || severity === 'HIGH'
        }
      });

      analyses.push(analysis);

      await prisma.deploymentRiskSignal.create({
        data: {
          deploymentRunId,
          riskType: 'COGNITIVE_SPIKE',
          severity,
          description: `Cognitive load spike on ${workflowPath}: ${currentMetrics.cognitiveLoad}% (baseline: ${baseCognitive}%)`
        }
      });
    }

    // Record timeline event if any regressions were found
    if (analyses.length > 0) {
      await prisma.releaseTimelineEvent.create({
        data: {
          deploymentRunId,
          eventType: 'REGRESSION_DETECTED',
          eventTitle: 'UX Regression Detected',
          description: `Flagged ${analyses.length} regressions in path ${workflowPath}`
        }
      });
    }

    return analyses;
  }
}
