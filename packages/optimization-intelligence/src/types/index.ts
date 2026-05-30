// ─── Phase 12 Part 3: Optimization Intelligence Domain Types ─────────────────

export type ExperimentStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ABANDONED';
export type ChangeType = 'UI_COPY' | 'LAYOUT' | 'FLOW' | 'CTA' | 'FORM' | 'NAVIGATION' | 'TIMING';
export type OutcomeConclusion = 'IMPROVED' | 'REGRESSED' | 'NEUTRAL' | 'INCONCLUSIVE';
export type AdoptionStatus = 'PENDING' | 'ADOPTED' | 'REJECTED' | 'DEFERRED';
export type VerificationStatus = 'UNVERIFIED' | 'VERIFIED_IMPROVED' | 'VERIFIED_NEUTRAL' | 'VERIFIED_REGRESSED';
export type MemoryType = 'SUCCESSFUL_PATTERN' | 'FAILED_PATTERN' | 'RECOMMENDATION_HISTORY' | 'IMPROVEMENT_HISTORY';
export type EvidenceType = 'ANOMALY' | 'LIVE_SESSION' | 'TELEMETRY_SIGNAL' | 'SURVIVABILITY_DROP' | 'FRICTION_SPIKE';

export interface ExperimentCandidate {
  projectId: string;
  name: string;
  description: string;
  targetMetric: string;
  targetWorkflow?: string;
  evaluationWindowDays?: number;
}

export interface HypothesisCandidate {
  projectId: string;
  experimentId?: string;
  problemStatement: string;
  supportingEvidence: string[];
  expectedImprovement: string;
  measurementStrategy: string;
  riskAssessment: string;
  evaluationWindowDays?: number;
  successThreshold?: number;
}

export interface VariantDefinition {
  name: string;
  isControl: boolean;
  description: string;
  changeType: ChangeType;
  changeDetails: Record<string, any>;
}

export interface MetricSnapshot {
  metricName: string;
  value: number;
  capturedAt: Date;
  scopeKey?: string;
}

export interface EvaluationResult {
  conclusion: OutcomeConclusion;
  confidenceScore: number;
  baselineValue: number;
  outcomeValue: number;
  deltaPercent: number;
  unexpectedEffects?: string;
  notes?: string;
}

export interface ImpactRecord {
  recommendationType: string;
  title: string;
  description: string;
  baselineSurvivability?: number;
  currentSurvivability?: number;
  baselineFriction?: number;
  currentFriction?: number;
}

export interface MemoryPattern {
  memoryType: MemoryType;
  patternKey: string;
  patternSummary: string;
  outcomeType: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  metricImpacted: string;
  deltaAchieved?: number;
  experimentId?: string;
  evidenceDetails?: Record<string, any>;
}

export interface ComparisonResult {
  metricName: string;
  baselineValue: number;
  currentValue: number;
  deltaPercent: number;
  direction: 'IMPROVED' | 'REGRESSED' | 'NEUTRAL';
  isUnexpected: boolean;
}

export interface TimelineEvent {
  timestamp: Date;
  event: string;
  details: Record<string, any>;
}
