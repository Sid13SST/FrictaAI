export type SignalSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface UXFindingData {
  id?: string;
  workflowSessionId: string;
  findingType: string;
  severity: SignalSeverity;
  personaType: string;
  title: string;
  description: string;
  evidence: string;
  recommendation: string;
  timestamp?: Date;
}

export interface CognitiveSignalData {
  id?: string;
  workflowSessionId: string;
  signalType: string;
  intensity: number;
  metadata?: any;
  timestamp?: Date;
}

export interface PersonaProfileData {
  id?: string;
  name: string;
  description: string;
  traits: {
    guidanceDependency: 'low' | 'medium' | 'high';
    patience: 'low' | 'medium' | 'high';
    comfortWithIA: 'low' | 'medium' | 'high';
  };
  behaviorModifiers: {
    idleHesitationThresholdMs: number;
    maxActionCyclesAllowed: number;
    excessiveStepsThreshold: number;
  };
}

export interface UXScore {
  clarityScore: number;
  onboardingScore: number;
  iaScore: number;
  efficiencyScore: number;
  overallScore: number;
}

export interface ActionData {
  id: string;
  action: string;
  target: string;
  value: string | null;
  status: string;
  stepNumber: number;
  errorMessage: string | null;
  timestamp: Date;
}

export interface ThoughtData {
  id: string;
  thought: string;
  stepNumber: number;
  timestamp: Date;
}

export interface InteractionData {
  id: string;
  sessionId: string;
  type: string;
  target: string;
  metadata: any;
  timestamp: Date;
}

export interface ScreenshotMetadata {
  stepIndex: number;
  pageUrl: string;
  elements?: Array<{
    id: string;
    tagName: string;
    text: string;
    boundingBox: { x: number; y: number; width: number; height: number };
    role?: string;
    intent?: string;
  }>;
  regions?: Array<{
    id: string;
    regionType: string;
    boundingBox: { x: number; y: number; width: number; height: number };
  }>;
}

export interface SessionActivityData {
  id: string;
  goal: string | null;
  persona: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  actions: ActionData[];
  thoughts: ThoughtData[];
  interactions: InteractionData[];
  screenshots: Array<{
    id: string;
    stepIndex: number;
    pageUrl: string;
    metadata: any; // Contains ScreenshotMetadata
  }>;
}

export interface UXReportPayload {
  sessionId: string;
  scores: UXScore;
  findings: UXFindingData[];
  cognitiveSignals: CognitiveSignalData[];
  personaProfiles: PersonaProfileData[];
}
