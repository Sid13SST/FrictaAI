import { UXFindingData, CognitiveSignalData, PersonaProfileData } from '@fricta/ux-intelligence';
import { VisualFindingData } from '@fricta/visual-intelligence';

export interface WorkflowSessionDetails {
  id: string;
  goal: string | null;
  persona: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  stepCount: number;
}

export interface UnifiedUXReportPayload {
  session: WorkflowSessionDetails;
  scores: {
    clarityScore: number;
    onboardingScore: number;
    iaScore: number;
    efficiencyScore: number;
    overallScore: number;
  };
  uxFindings: UXFindingData[];
  cognitiveSignals: CognitiveSignalData[];
  visualFindings: VisualFindingData[];
  personaProfiles: PersonaProfileData[];
}

export interface ExecutiveSummaryPayload {
  overallUXGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  overallScore: number;
  onboardingFrictionLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  discoverabilityRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  majorFrictionStepIndices: number[];
  synthesizedInsights: string[];
}

export interface CorrelatedTimelineEvent {
  id: string;
  stepIndex: number;
  timestamp: Date;
  eventType: 'ACTION' | 'THOUGHT' | 'ERROR' | 'VISUAL_FINDING' | 'COGNITIVE_SPIKE';
  title: string;
  description: string;
  metadata?: any;
}
