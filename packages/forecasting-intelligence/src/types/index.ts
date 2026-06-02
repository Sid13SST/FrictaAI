export type ForecastType = 'KPI' | 'OUTCOME' | 'INITIATIVE' | 'RISK' | 'OBJECTIVE' | 'PRODUCT_HEALTH';
export type ScenarioType = 'BEST_CASE' | 'EXPECTED' | 'WORST_CASE' | 'DELAYED_INITIATIVE' | 'KPI_REGRESSION' | 'RISK_ESCALATION';
export type RiskType = 'KPI_RISK' | 'UX_RISK' | 'STRATEGIC_RISK' | 'INITIATIVE_RISK' | 'GOVERNANCE_RISK';

export interface ForecastRecord {
  id: string;
  projectId: string;
  forecastType: ForecastType;
  targetEntityId: string;
  targetEntityName: string;
  metricName: string;
  currentValue: number;
  projectedValue: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  targetDate: string;
  createdAt: string;
  updatedAt: string;
  evidences?: StrategicForecastEvidence[];
  assumptions?: ForecastAssumption[];
  confidences?: ConfidenceRecord[];
}

export interface StrategicForecastEvidence {
  id: string;
  projectId: string;
  forecastId: string;
  evidenceType: 'HISTORICAL_PATTERN' | 'HISTORICAL_CASE' | 'TELEMETRY_REPLAY' | 'OUTCOME_VERDICT';
  referenceId: string;
  description: string;
  createdAt: string;
}

export interface ScenarioAnalysis {
  id: string;
  projectId: string;
  title: string;
  description: string;
  scenarioType: ScenarioType;
  parameters: any;
  createdAt: string;
  updatedAt: string;
  outcomes?: ScenarioOutcome[];
}

export interface ScenarioOutcome {
  id: string;
  projectId: string;
  scenarioId: string;
  metricName: string;
  projectedValue: number;
  deltaPercent: number;
  description: string;
  createdAt: string;
}

export interface ForecastAssumption {
  id: string;
  projectId: string;
  forecastId: string;
  statement: string;
  validityStatus: 'VALID' | 'INVALID' | 'UNKNOWN';
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
}

export interface EmergingRisk {
  id: string;
  projectId: string;
  riskType: RiskType;
  title: string;
  description: string;
  severity: number;
  probability: number;
  triggerCondition: string;
  isDetected: boolean;
  detectedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConfidenceRecord {
  id: string;
  projectId: string;
  forecastId: string;
  score: number;
  explanation: string;
  factors: any;
  createdAt: string;
}
