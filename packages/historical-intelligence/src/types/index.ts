export interface UXMetricSummary {
  duration: number;
  stepCount: number;
  successRate: number;
  cognitiveOverloadCount: number;
  hesitationCount: number;
}

export interface SessionComparisonResult {
  baseSessionId: string;
  compareSessionId: string;
  metricDeltas: {
    durationDelta: number;
    stepCountDelta: number;
    cognitiveOverloadDelta: number;
    hesitationDelta: number;
  };
  regressions: {
    metricName: string;
    baseValue: number;
    currentValue: number;
    deltaPercentage: number;
    explanation: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }[];
}
