export interface LongitudinalTrendData {
  trendType: 'stability' | 'complexity' | 'risk';
  interval: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  timestamp: Date;
  scoreValue: number;
  metadata: any;
}

export interface FrictionPattern {
  patternName: string;
  category: 'FRICTION' | 'NAVIGATION' | 'ATTENTION';
  description: string;
  evidenceCount: number;
  supportingData: {
    sessionIds: string[];
    coordinates?: { x: number; y: number }[];
    targetElements: string[];
    severities: string[];
  };
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  resolved?: boolean;
}

export interface RegressionDetail {
  metricName: string;
  baseVersion: string;
  compareVersion: string;
  baseValue: number;
  compareValue: number;
  changePercent: number;
  status: 'IMPROVED' | 'STABLE' | 'DEGRADED';
  triggerSignals: {
    signals: string[];
    elements: string[];
  };
}

export interface PersonaEvolutionProgress {
  personaName: string;
  adaptationRate: number;
  frictionIndex: number;
  successRate: number;
  fatigueTrend: {
    steps: number[];
    loads: number[];
  };
}

export interface UXMemorySnapshotSummary {
  snapshotName: string;
  summary: string;
  patternCount: number;
  activeRiskCount: number;
  trendHealth: number;
}

export interface SurvivabilityData {
  personaName: string;
  stepLimit: number;
  predictedSurvivalRate: number;
  exitTriggers: string[];
}

export interface ComparisonResult {
  sessionAId: string;
  sessionBId: string;
  similarity: number;
  sharedFriction: string[];
  deltaNotes?: string;
}

export interface LongitudinalSignalDetail {
  elementSelector: string;
  signalType: 'HESITATION' | 'FATIGUE_SPIKE' | 'MISMATCH';
  frequency: number;
  averageSeverity: number;
  historicalBasis: {
    sessionIds: string[];
    timestamps: string[];
  };
}
