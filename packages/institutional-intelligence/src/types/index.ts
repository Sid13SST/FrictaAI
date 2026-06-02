export type LessonType = 'UX' | 'STRATEGIC' | 'OUTCOME' | 'GOVERNANCE';
export type PrincipleType = 'SUCCESS_PATTERN' | 'FAILURE_PATTERN' | 'DESIGN_GUIDELINE';
export type WisdomEvidenceType = 'HISTORICAL_CASE' | 'OUTCOME_VERDICT' | 'KPI_TREND' | 'TELEMETRY_REPLAY';

export interface InstitutionalLesson {
  id: string;
  projectId: string;
  title: string;
  summary: string;
  lessonType: LessonType;
  content: string;
  impactScore: number;
  occurrences: number;
  timespanMonths: number;
  createdAt: string;
  updatedAt: string;
  evidences?: WisdomEvidence[];
}

export interface OrganizationalPrinciple {
  id: string;
  projectId: string;
  statement: string;
  description: string;
  principleType: PrincipleType;
  supportRate: number;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WisdomRecord {
  id: string;
  projectId: string;
  category: 'EXECUTIVE' | 'OPERATIONAL';
  title: string;
  description: string;
  wisdomData: {
    lessonType: LessonType;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    firstObserved: string;
    lastObserved: string;
    supportingCases: number;
    evidenceCount: number;
    outcomeReferences: string[];
    kpiReferences: string[];
    validationMethod: string;
    auditTrail: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface WisdomEvidence {
  id: string;
  projectId: string;
  lessonId: string;
  evidenceType: WisdomEvidenceType;
  referenceId: string;
  description: string;
  createdAt: string;
  linkedData?: any;
}

export interface HistoricalSynthesis {
  id: string;
  projectId: string;
  title: string;
  summary: string;
  synthesisType: 'ANNUAL' | 'QUARTERLY' | 'CROSS_PRODUCT';
  details: any;
  createdAt: string;
  updatedAt: string;
}

export interface LongTermTrend {
  id: string;
  projectId: string;
  metricName: string;
  direction: 'IMPROVING' | 'DEGRADED' | 'STABLE';
  description: string;
  changePercent: number;
  timespanDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface StrategicLearning {
  id: string;
  projectId: string;
  title: string;
  description: string;
  learningType: 'COMPETITIVE' | 'REGULATORY' | 'EXECUTIVE';
  impactRating: number;
  createdAt: string;
  updatedAt: string;
}

export interface WisdomSnapshot {
  id: string;
  projectId: string;
  lessonsCount: number;
  principlesCount: number;
  snapshotData: any;
  recordedAt: string;
}
