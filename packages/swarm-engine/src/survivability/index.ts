export class SurvivabilityEngine {
  /**
   * Evaluates overall survivability metrics across all concurrent runs.
   */
  public static calculate(
    executions: Array<{
      status: string;
      stepsCompleted: number;
      frictionScore: number;
      replays: any[];
    }>
  ): {
    overallCompletionRate: number;
    averageSteps: number;
    failureClusterCount: number;
    abandonmentRiskAverage: number;
    failurePoints: string[];
  } {
    if (executions.length === 0) {
      return {
        overallCompletionRate: 0,
        averageSteps: 0,
        failureClusterCount: 0,
        abandonmentRiskAverage: 0,
        failurePoints: [],
      };
    }

    const completed = executions.filter(
      (e) => e.status === 'COMPLETED' || e.status === 'SUCCESS'
    );
    const overallCompletionRate = completed.length / executions.length;

    const totalSteps = executions.reduce((acc, e) => acc + e.stepsCompleted, 0);
    const averageSteps = totalSteps / executions.length;

    const failureSelectors: Record<string, number> = {};
    let totalFriction = 0;

    for (const exec of executions) {
      totalFriction += exec.frictionScore;
      if (exec.status !== 'COMPLETED' && exec.status !== 'SUCCESS') {
        const lastStep = exec.replays[exec.replays.length - 1];
        if (lastStep && lastStep.targetSelector) {
          failureSelectors[lastStep.targetSelector] =
            (failureSelectors[lastStep.targetSelector] || 0) + 1;
        }
      }
    }

    const failurePoints = Object.entries(failureSelectors)
      .sort((a, b) => b[1] - a[1])
      .map(([selector]) => selector);

    const failureClusterCount = Object.keys(failureSelectors).length;
    const abandonmentRiskAverage = totalFriction / executions.length;

    return {
      overallCompletionRate,
      averageSteps,
      failureClusterCount,
      abandonmentRiskAverage,
      failurePoints,
    };
  }
}
