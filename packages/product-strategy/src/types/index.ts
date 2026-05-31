export interface StrategicObjectiveInput {
  title: string;
  description: string;
  targetMetric?: string;
  targetValue?: number;
}

export interface ProductInitiativeInput {
  objectiveId?: string;
  title: string;
  description: string;
  owner?: string;
  complexity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  effortScore?: number; // 1-10 points
  targetQuarter?: string;
}

export interface InitiativeEvidenceInput {
  evidenceType: 'REPLAY' | 'INVESTIGATION' | 'ANOMALY' | 'SIGNAL' | 'HISTORY';
  referenceId: string;
  description: string;
  metadata?: any;
}

export interface StrategicRiskInput {
  riskType: 'DEPENDENCY' | 'COMPLEXITY' | 'RESOURCE' | 'UX_REGRESSION';
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  mitigationPlan: string;
}

export interface OpportunityScoreInput {
  opportunityId?: string;
  title: string;
  reachScore: number;
  impactScore: number;
  confidenceScore: number;
  effortScore: number;
}

export interface ExecutiveDashboardSnapshot {
  productHealthScore: number;
  strategicRiskScore: number;
  uxHealthScore: number;
  opportunityPipelineCount: number;
  activeInitiativesCount: number;
}
