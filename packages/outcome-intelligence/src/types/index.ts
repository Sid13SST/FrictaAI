export type KPIType =
  | 'ADOPTION'
  | 'ACTIVATION'
  | 'RETENTION'
  | 'COMPLETION'
  | 'ENGAGEMENT'
  | 'SURVIVABILITY'
  | 'SUCCESS'
  | 'UX_HEALTH';

export type OutcomeVerdict = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'INCONCLUSIVE';

export interface KPIConfig {
  name: string;
  description: string;
  kpiType: KPIType;
  metricKey: string;
  targetValue?: number;
  owner?: string;
}

export interface OutcomeBaselineConfig {
  value: number;
  windowStart: Date;
  windowEnd: Date;
}

export interface KPIForecastConfig {
  projectedValue: number;
  confidenceLower: number;
  confidenceUpper: number;
  targetQuarter: string;
}

export interface OutcomeEvaluationResult {
  outcomeId: string;
  title: string;
  verdict: OutcomeVerdict;
  evaluatedAt: Date;
  deltas: {
    kpiId: string;
    kpiName: string;
    baselineValue: number;
    postValue: number;
    deltaPercent: number;
    correlation: number;
    contribution: string;
  }[];
}
