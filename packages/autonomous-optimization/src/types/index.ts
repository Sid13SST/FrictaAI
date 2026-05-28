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
