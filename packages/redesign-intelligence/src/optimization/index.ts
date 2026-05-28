export interface MetricImpactForecast {
  metricName: string;
  beforeValue: number;
  afterValue: number;
}

export function projectMetricImpact(
  metricName: string,
  currentValue: number,
  expectedGain: number
): MetricImpactForecast {
  return {
    metricName,
    beforeValue: currentValue,
    afterValue: Math.round(Math.min(100, currentValue * (1.0 + expectedGain / 100)) * 10) / 10
  };
}
