import { RegressionInput } from '../types';

export class RegressionPredictor {
  public static calculate(
    baseline: { successRate: number; averageFriction: number; cognitiveLoadAverage: number; averageSteps: number },
    forecastedStats: { successRate: number; averageFriction: number; cognitiveLoadAverage: number; averageSteps: number }
  ): RegressionInput[] {
    const events: RegressionInput[] = [];

    // 1. Completion Rate Regression
    const rateDrift = ((forecastedStats.successRate - baseline.successRate) / baseline.successRate) * 100;
    if (rateDrift < -5) {
      events.push({
        metricName: 'COMPLETION_RATE',
        baseValue: baseline.successRate,
        forecastedValue: forecastedStats.successRate,
        driftPercentage: rateDrift,
        severity: Math.abs(rateDrift) > 15 ? 'CRITICAL' : 'HIGH',
        contributingFactors: ['Increased validation failures', 'Elevated abandonment on registration steps'],
      });
    }

    // 2. Friction Score Drift
    const frictionDrift = ((forecastedStats.averageFriction - baseline.averageFriction) / baseline.averageFriction) * 100;
    if (frictionDrift > 10) {
      events.push({
        metricName: 'FRICTION_SCORE',
        baseValue: baseline.averageFriction,
        forecastedValue: forecastedStats.averageFriction,
        driftPercentage: frictionDrift,
        severity: frictionDrift > 30 ? 'HIGH' : 'MEDIUM',
        contributingFactors: ['Longer hover durations on input fields', 'Extended cursor scanning routes'],
      });
    }

    // 3. Cognitive Load Drift
    const loadDrift = ((forecastedStats.cognitiveLoadAverage - baseline.cognitiveLoadAverage) / baseline.cognitiveLoadAverage) * 100;
    if (loadDrift > 8) {
      events.push({
        metricName: 'COGNITIVE_LOAD',
        baseValue: baseline.cognitiveLoadAverage,
        forecastedValue: forecastedStats.cognitiveLoadAverage,
        driftPercentage: loadDrift,
        severity: loadDrift > 20 ? 'HIGH' : 'MEDIUM',
        contributingFactors: ['Visual layout complexity increase', 'Focal CTA discoverability reduction'],
      });
    }

    // 4. Steps to Complete
    const stepsDrift = ((forecastedStats.averageSteps - baseline.averageSteps) / baseline.averageSteps) * 100;
    if (stepsDrift > 5) {
      events.push({
        metricName: 'STEPS_TO_COMPLETE',
        baseValue: baseline.averageSteps,
        forecastedValue: forecastedStats.averageSteps,
        driftPercentage: stepsDrift,
        severity: 'LOW',
        contributingFactors: ['Addition of secondary optional configurations', 'User backtracking to verify fields'],
      });
    }

    return events;
  }
}
