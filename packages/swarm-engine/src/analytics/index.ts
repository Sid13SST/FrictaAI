export class AnalyticsEngine {
  /**
   * Generates overall population analytics.
   */
  public static calculate(
    executions: Array<{
      personaType: string;
      status: string;
      frictionScore: number;
      stepsCompleted: number;
      replays: any[];
    }>
  ): {
    personaCompletionRates: Record<string, number>;
    frictionDistribution: Record<string, number>;
    workflowStabilityScore: number;
    cognitiveFailureRate: number;
    pathVariability: number;
    successRate: number;
    averageConfidenceCurve: number[];
  } {
    if (executions.length === 0) {
      return {
        personaCompletionRates: {},
        frictionDistribution: {},
        workflowStabilityScore: 0,
        cognitiveFailureRate: 0,
        pathVariability: 0,
        successRate: 0,
        averageConfidenceCurve: [],
      };
    }

    const personaCompletionRates: Record<string, number> = {};
    const frictionDistribution: Record<string, number> = {};
    let totalSuccess = 0;
    let totalFriction = 0;
    let totalHighFrictionCount = 0;

    for (const exec of executions) {
      const isSuccess = exec.status === 'COMPLETED' || exec.status === 'SUCCESS';
      if (isSuccess) totalSuccess++;

      personaCompletionRates[exec.personaType] = isSuccess ? 1 : 0;
      frictionDistribution[exec.personaType] = exec.frictionScore;

      totalFriction += exec.frictionScore;
      if (exec.frictionScore > 0.5) {
        totalHighFrictionCount++;
      }
    }

    const successRate = totalSuccess / executions.length;
    const workflowStabilityScore = Math.max(
      0,
      1.0 - (1.0 - successRate) * 0.6 - (totalHighFrictionCount / executions.length) * 0.4
    );

    const uniqueStepCounts = new Set(executions.map((e) => e.stepsCompleted));
    const pathVariability = uniqueStepCounts.size / Math.max(executions.length, 1);

    let totalStepCount = 0;
    let cognitiveFailures = 0;
    const confidenceCurveMap: Record<number, { sum: number; count: number }> = {};

    for (const exec of executions) {
      for (const step of exec.replays) {
        totalStepCount++;
        if (step.cognitiveLoad > 0.7 || step.confidence < 0.3) {
          cognitiveFailures++;
        }

        const idx = step.stepIndex;
        if (!confidenceCurveMap[idx]) {
          confidenceCurveMap[idx] = { sum: 0, count: 0 };
        }
        confidenceCurveMap[idx].sum += step.confidence;
        confidenceCurveMap[idx].count++;
      }
    }

    const cognitiveFailureRate = totalStepCount > 0 ? cognitiveFailures / totalStepCount : 0;

    const averageConfidenceCurve = Object.keys(confidenceCurveMap)
      .map(Number)
      .sort((a, b) => a - b)
      .map((idx) => confidenceCurveMap[idx].sum / confidenceCurveMap[idx].count);

    return {
      personaCompletionRates,
      frictionDistribution,
      workflowStabilityScore,
      cognitiveFailureRate,
      pathVariability,
      successRate,
      averageConfidenceCurve,
    };
  }
}
