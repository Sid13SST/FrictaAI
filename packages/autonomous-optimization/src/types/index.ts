export interface AutonomousOptimizationRunSummary {
  id?: string;
  workflowPath: string;
  status: 'PENDING_APPROVAL' | 'SIMULATING' | 'APPLIED' | 'ROLLED_BACK' | 'FAILED';
  recommendationId?: string;
  remediationPlan: string;
  targetSelector?: string;
  overallSafetyScore: number;
  simulations?: OptimizationSimulationSummary[];
  approvals?: OptimizationApprovalSummary[];
  rollbacks?: OptimizationRollbackSummary[];
  decisionTraces?: AutonomousDecisionTraceSummary[];
  safetySignals?: OptimizationSafetySignalSummary[];
}

export interface OptimizationSimulationSummary {
  id?: string;
  optimizationRunId: string;
  personaType: string;
  simulatedSurvivalGain: number;
  simulatedClarityGain: number;
  cognitiveLoadBefore: number;
  cognitiveLoadAfter: number;
  verdict: 'SUCCESS' | 'DEGRADED' | 'NEUTRAL';
  simulatedLogs: any;
}

export interface AdaptationRuleSummary {
  id?: string;
  ruleKey: string;
  description: string;
  triggerSelector: string;
  thresholdMetric: string;
  thresholdValue: number;
  mitigationValue: string;
  active: boolean;
}

export interface OptimizationApprovalSummary {
  id?: string;
  optimizationRunId: string;
  reviewedById?: string;
  roleScope: string;
  action: 'APPROVED' | 'REJECTED' | 'REQUESTED_CHANGES';
  comments?: string;
}

export interface OptimizationRollbackSummary {
  id?: string;
  optimizationRunId: string;
  initiatedById?: string;
  rollbackReason: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

export interface AutonomousDecisionTraceSummary {
  id?: string;
  optimizationRunId: string;
  stepIndex: number;
  decisionNode: string;
  outcomeDescription: string;
  evidenceRefId?: string;
}

export interface OptimizationGovernanceEventSummary {
  id?: string;
  userId?: string;
  action: string;
  description: string;
  policyPassed: boolean;
}

export interface OptimizationSafetySignalSummary {
  id?: string;
  optimizationRunId: string;
  metricName: string;
  metricValue: number;
  thresholdLimit: number;
  policyPassed: boolean;
}

// ─── Phase 12 Part 4 Planning Types ───────────────────────────────────────────

export interface OpportunityCandidate {
  projectId: string;
  opportunityType: 'HIGH_FRICTION' | 'ONBOARDING' | 'CTA' | 'NAVIGATION' | 'COGNITIVE' | 'WORKFLOW' | 'SURVIVABILITY';
  title: string;
  description: string;
  evidence: any[];
  score: number;
  impactPotential: number;
  userReach: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  survivabilityGain: number;
  implementationComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ForecastDefinition {
  projectId: string;
  opportunityId?: string;
  planId?: string;
  metricName: string;
  currentValue: number;
  forecastedValue: number;
  confidenceIntervalLower: number;
  confidenceIntervalUpper: number;
  uncertaintyDetails: string;
}

export interface RoadmapDefinition {
  projectId: string;
  quarter: string;
  title: string;
  description: string;
}

export interface InitiativeCandidate {
  projectId: string;
  planId?: string;
  opportunityId?: string;
  roadmapId?: string;
  title: string;
  description: string;
  impactArea: string;
  score: number;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface DecisionInput {
  userId?: string;
  action: 'APPROVED' | 'REJECTED' | 'ARCHIVED' | 'CONVERT_TO_EXPERIMENT' | 'CONVERT_TO_INVESTIGATION' | 'CONVERT_TO_JIRA';
  comments?: string;
  externalReference?: string;
}

export interface SynthesisResult {
  opportunities: OpportunityCandidate[];
  initiatives: InitiativeCandidate[];
  forecasts: ForecastDefinition[];
}

