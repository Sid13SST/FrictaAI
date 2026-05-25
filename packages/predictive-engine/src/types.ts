export interface PredictiveConfig {
  projectId: string;
  workflowPath: string;
  baselineName?: string;
}

export interface RiskSignalInput {
  stepIndex: number;
  riskType: string;
  confidenceScore: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  targetSelector?: string;
  contributingSignals: string[];
  evidenceNotes: string;
  historicalBasis: string;
}

export interface RegressionInput {
  metricName: string;
  baseValue: number;
  forecastedValue: number;
  driftPercentage: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  contributingFactors: string[];
}

export interface SurvivabilityInput {
  personaType: string;
  predictedSurvivalRate: number;
  estimatedStepsToAbandon: number;
  primaryAbandonmentTrigger: string;
  riskFactors: string[];
}

export interface AbandonmentInput {
  stepIndex: number;
  abandonmentProbability: number;
  triggerSource: string;
  cognitiveLoadEscalation: number;
  confidenceCollapseProbability: number;
  retryDensityImpact: number;
  hesitationAccumulationMs: number;
  description: string;
}

export interface TimelineEventInput {
  stepIndex: number;
  eventType: 'FRICTION_ESCALATION' | 'CONFIDENCE_COLLAPSE' | 'ABANDONMENT_TREND' | 'REGRESSION_RISK' | 'COGNITIVE_OVERLOAD';
  timeOffsetMs: number;
  predictedIntensity: number;
  description: string;
}
