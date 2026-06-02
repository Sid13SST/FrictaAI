export type PatternType =
  | 'SUCCESS'
  | 'FAILURE'
  | 'FRICTION'
  | 'RISK'
  | 'KPI_MOVEMENT'
  | 'OUTCOME';

export interface LearningPattern {
  id: string;
  projectId: string;
  patternName: string;
  patternType: PatternType;
  description: string;
  confidence: number;
  occurrences: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface HistoricalCase {
  id: string;
  projectId: string;
  title: string;
  description: string;
  caseType: 'SUCCESS' | 'FAILURE' | 'NEUTRAL';
  outcomeValue?: number | null;
  recommendationId?: string | null;
  successRate: number;
  failureRate: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SuccessPattern {
  id: string;
  projectId: string;
  title: string;
  description: string;
  winCategory: 'CONVERSION' | 'RETENTION' | 'COMPLETION' | 'FRICTION_REDUCTION';
  impactScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FailurePattern {
  id: string;
  projectId: string;
  title: string;
  description: string;
  mistakeType: 'RAGE_CLICK_LOOP' | 'CTA_ABANDONMENT' | 'NAV_LOOPS' | 'FORM_EXIT';
  impactScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecurrenceRecord {
  id: string;
  projectId: string;
  patternId: string;
  entityType: 'REPLAY' | 'UX_ANOMALY' | 'PRODUCT_KPI' | 'OUTCOME' | 'RISK';
  referenceId: string;
  details: string;
  timestamp: Date;
}

export interface OrganizationalLesson {
  id: string;
  projectId: string;
  title: string;
  summary: string;
  lessonType: 'WIN' | 'MISTAKE';
  impactScore: number;
  evidence: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatternEvidence {
  id: string;
  projectId: string;
  patternId: string;
  evidenceType: 'TELEMETRY' | 'ANOMALY' | 'REPLAY' | 'INVESTIGATION' | 'KPI_HISTORICAL' | 'OUTCOME';
  referenceId: string;
  description: string;
  createdAt: Date;
}

export interface LearningSnapshot {
  id: string;
  projectId: string;
  patternCount: number;
  lessonCount: number;
  snapshotData: any;
  recordedAt: Date;
}
