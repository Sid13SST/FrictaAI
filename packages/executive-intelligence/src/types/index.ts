export type RecommendationType = 'INITIATIVE' | 'STRATEGIC' | 'RISK' | 'CAPACITY';
export type RecommendationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RecommendationStatus = 'ACTIVE' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED';

export type DecisionAction = 'APPROVE' | 'REJECT' | 'ARCHIVE';
export type DecisionStatus = 'PENDING' | 'TARGET_ACHIEVED' | 'TARGET_MISSED';

export type GovernanceReviewType = 'INITIATIVE' | 'POLICY' | 'COMPLIANCE';
export type GovernanceVerdict = 'COMPLIANT' | 'NON_COMPLIANT' | 'WARNING';

export type RiskSource = 'INITIATIVE' | 'KPI' | 'GOVERNANCE' | 'UX';
export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RiskStatus = 'MONITORED' | 'ESCALATED' | 'RESOLVED';

export type PolicyStatus = 'PASSED' | 'WARNING' | 'FAILED';

export type EvidenceType = 'INITIATIVE' | 'KPI' | 'OUTCOME' | 'UX_ANOMALY' | 'REPLAY' | 'INVESTIGATION';

export interface ExecutiveRecommendation {
  id: string;
  projectId: string;
  title: string;
  description: string;
  recommendationType: RecommendationType;
  priority: RecommendationPriority;
  status: RecommendationStatus;
  evidenceCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  decisions?: DecisionRecord[];
  evidence?: ExecutiveEvidence[];
}

export interface DecisionRecord {
  id: string;
  recommendationId: string;
  userId: string;
  action: DecisionAction;
  notes?: string | null;
  createdAt: Date | string;
  outcomes?: DecisionOutcome[];
}

export interface GovernanceReview {
  id: string;
  projectId: string;
  reviewType: GovernanceReviewType;
  targetId: string;
  verdict: GovernanceVerdict;
  details: string;
  reviewedBy: string;
  reviewedAt: Date | string;
}

export interface StrategicRiskRecord {
  id: string;
  projectId: string;
  riskSource: RiskSource;
  sourceId?: string | null;
  title: string;
  description: string;
  severity: RiskSeverity;
  probability: number;
  impact: number;
  compositeScore: number;
  status: RiskStatus;
  createdAt: Date | string;
}

export interface ExecutiveHealthSnapshot {
  id: string;
  projectId: string;
  productHealth: number;
  strategicHealth: number;
  portfolioHealth: number;
  uxHealth: number;
  kpiHealth: number;
  compositeHealth: number;
  recordedAt: Date | string;
}

export interface GovernancePolicyReview {
  id: string;
  projectId: string;
  policyName: string;
  complianceRate: number;
  status: PolicyStatus;
  checkedAt: Date | string;
}

export interface ExecutiveEvidence {
  id: string;
  recommendationId: string;
  evidenceType: EvidenceType;
  referenceId: string;
  description: string;
  createdAt: Date | string;
}

export interface DecisionOutcome {
  id: string;
  decisionId: string;
  metricKey: string;
  expectedDelta: number;
  actualDelta?: number | null;
  measuredAt?: Date | string | null;
  status: DecisionStatus;
}
