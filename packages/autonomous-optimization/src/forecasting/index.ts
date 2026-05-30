import type { OpportunityCandidate, ForecastDefinition } from '../types';

export class Forecaster {
  /**
   * Generates mathematical forecasts for a target opportunity based on active telemetry.
   * Projections are bounded and specify lower/upper confidence intervals so that
   * human operators can gauge implementation risks and potential rewards.
   */
  static generateForecast(op: OpportunityCandidate, metrics: any[]): ForecastDefinition {
    const metricName = op.opportunityType === 'ONBOARDING' ? 'onboarding_survivability' :
                       op.opportunityType === 'HIGH_FRICTION' ? 'rage_click_rate' :
                       op.opportunityType === 'CTA' ? 'cta_survivability' :
                       op.opportunityType === 'NAVIGATION' ? 'navigation_survivability' :
                       op.opportunityType === 'COGNITIVE' ? 'cognitive_survivability' : 'workflow_survivability';

    // Find current baseline value from recent telemetry
    const matchedMetric = metrics.find(m => m.metricType.toLowerCase().includes(op.opportunityType.toLowerCase()));
    const currentValue = matchedMetric ? matchedMetric.value : (metricName.includes('rate') ? 0.35 : 0.85);

    // Calculate projected change
    let forecastedValue = currentValue;
    if (metricName.includes('rate')) {
      // Lower rate = better
      forecastedValue = currentValue * (1 - op.survivabilityGain);
    } else {
      // Higher survivability = better
      forecastedValue = Math.min(1.0, currentValue + op.survivabilityGain);
    }

    // Build confidence intervals based on op.confidence
    const variance = (1 - op.confidence) * 0.15; // lower confidence = wider range
    const lower = Math.max(0.0, forecastedValue - variance);
    const upper = Math.min(1.0, forecastedValue + variance);

    return {
      projectId: op.projectId,
      metricName,
      currentValue: parseFloat(currentValue.toFixed(3)),
      forecastedValue: parseFloat(forecastedValue.toFixed(3)),
      confidenceIntervalLower: parseFloat(lower.toFixed(3)),
      confidenceIntervalUpper: parseFloat(upper.toFixed(3)),
      uncertaintyDetails: `Forecast based on ${op.evidence.length} trace items with an engine confidence of ${(op.confidence * 100).toFixed(0)}%. Actual impact may vary depending on design implementation details.`
    };
  }
}
