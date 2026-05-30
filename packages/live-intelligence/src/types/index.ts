export type AnomalyType =
  | 'RAGE_CLICK_SPIKE'
  | 'NAV_LOOP_ESCALATION'
  | 'CTA_FAILURE_SURGE'
  | 'FORM_ABANDONMENT_SURGE'
  | 'SESSION_DROP_OFF_CLUSTER'
  | 'COGNITIVE_FRICTION_ESCALATION'
  | 'WORKFLOW_DEGRADATION'
  | 'SURVIVABILITY_COLLAPSE';

export type SeverityType = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type BaselineType =
  | 'HISTORICAL'
  | 'WORKSPACE'
  | 'WORKFLOW'
  | 'PERSONA'
  | 'VERSION'
  | 'DEPLOYMENT';

export type CorrelationType =
  | 'DEPLOYMENT'
  | 'VERSION'
  | 'PERSONA'
  | 'WORKFLOW'
  | 'SESSION'
  | 'INVESTIGATION';

export type SurvivabilityMetricType =
  | 'CTA_SURVIVABILITY'
  | 'ONBOARDING_SURVIVABILITY'
  | 'NAVIGATION_SURVIVABILITY'
  | 'WORKFLOW_SURVIVABILITY'
  | 'COGNITIVE_SURVIVABILITY';

export interface AnomalyThreshold {
  metricName: string;
  staticThreshold: number;
  stdDevMultiplier: number;
}

export interface CorrelationResult {
  correlationType: CorrelationType;
  correlationKey: string;
  coefficient: number;
  evidenceDetails: string;
}

export interface MetricValue {
  metricName: string;
  value: number;
  timestamp: Date;
}
