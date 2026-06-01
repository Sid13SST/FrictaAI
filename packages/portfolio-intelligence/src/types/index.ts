export type InvestmentAllocationCategory =
  | 'R_D'
  | 'GROWTH'
  | 'MAINTAIN'
  | 'RISK_REDUCTION'
  | 'SECURITY';

export type AlignmentStatus = 'ALIGNED' | 'MISALIGNED' | 'GAPPED';

export type GapType =
  | 'UNCOVERED_OBJECTIVE'
  | 'UNSUPPORTED_KPI'
  | 'NEGLECTED_COHORT'
  | 'HIGH_RISK_AREA';

export type DependencyType = 'BLOCKING' | 'CONCURRENT' | 'SEQUENTIAL';

export type DependencyStatus = 'ACTIVE' | 'RESOLVED' | 'RISK';

export interface AllocationConfig {
  category: InvestmentAllocationCategory;
  percentage: number;
  budgetAmount?: number;
}

export interface AlignmentResult {
  initiativeId: string;
  initiativeTitle: string;
  objectiveId?: string;
  objectiveTitle?: string;
  kpiId?: string;
  kpiName?: string;
  outcomeId?: string;
  outcomeVerdict?: string;
  alignmentScore: number;
  status: AlignmentStatus;
  comments: string;
  evidenceCount: number;
}

export interface PortfolioHealthSummary {
  portfolioId: string;
  name: string;
  alignmentScore: number;
  riskIndex: number;
  coverageScore: number;
  healthRating: number;
  recordedAt: Date;
}
