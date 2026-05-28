export interface PredictiveFailure {
  id?: string;
  workflowPath: string;
  predictedFailureType: 'ONBOARDING_COLLAPSE' | 'CTA_DEGRADATION' | 'NAVIGATION_BREAKDOWN' | 'FRICTION_ESCALATION';
  probability: number; // 0.0 to 1.0
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  targetSelector?: string;
  estimatedSteps?: number;
  description: string;
  evidence: PredictiveEvidence[];
  createdAt?: Date;
}

export interface PredictiveEvidence {
  id?: string;
  sessionRefId?: string;
  findingRefId?: string;
  evidenceDescription: string;
  confidenceWeight: number; // 0.0 to 1.0
}

export interface CognitiveOverloadForecast {
  id?: string;
  personaType: string;
  riskType: 'FATIGUE_SPIKE' | 'DECISION_OVERHEAD' | 'ATTENTION_FRAGMENTATION';
  predictedLoad: number; // 0.0 to 100.0
  estimatedStep: number;
  mitigationNotes: string;
  createdAt?: Date;
}

export interface WorkflowStabilityForecast {
  id?: string;
  workflowPath: string;
  riskScore: number; // 0.0 to 100.0
  onboardingFailureRate: number; // 0.0 to 1.0
  frictionEscalationRate: number; // 0.0 to 1.0
  stabilityIndex: number; // 0.0 to 100.0
  createdAt?: Date;
}

export interface PredictiveMetricsSummary {
  overallRiskScore: number;
  predictedFailuresCount: number;
  criticalRisksCount: number;
  averageOnboardingSurvivalRate: number;
  topRiskWorkflowPaths: { path: string; riskScore: number }[];
}
