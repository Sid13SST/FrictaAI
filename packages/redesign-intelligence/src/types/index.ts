export interface RedesignRecommendationSummary {
  id?: string;
  workflowPath: string;
  targetElement?: string;
  recommendationType: 'CTA_OPTIMIZATION' | 'ONBOARDING_STREAMLINE' | 'COGNITIVE_SIMPLIFICATION' | 'NAVIGATION_RESTRUCTURE';
  title: string;
  description: string;
  proposedChange: string;
  impactScore: number; // 0.0 to 100.0
  confidenceScore: number; // 0.0 to 1.0
  evidence: RecommendationEvidenceSummary[];
}

export interface RecommendationEvidenceSummary {
  id?: string;
  sessionRefId?: string;
  findingRefId?: string;
  evidenceNotes: string;
  metricDriftValue?: number;
}

export interface UXOptimizationProposal {
  id?: string;
  category: 'ACCESSIBILITY' | 'FRICTION_REDUCTION' | 'RETENTION';
  title: string;
  description: string;
  effortEstimate: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface CognitiveRemediationPlan {
  id?: string;
  targetStep: number;
  loadType: 'DECISION_COMPLEXITY' | 'ATTENTION_FRAGMENTATION' | 'FATIGUE';
  remediationPlan: string;
  complexityReduction: number; // e.g. 35.0 (%)
}

export interface WorkflowOptimizationSummary {
  id?: string;
  workflowPath: string;
  stepCountReduction: number;
  expectedSurvivalGain: number; // e.g. 15.0 (%)
  remediationStrategy: string;
}
