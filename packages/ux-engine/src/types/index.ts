export type SignalType = 
  | 'HESITATION' 
  | 'REPEATED_ACTION' 
  | 'NAVIGATION_LOOP' 
  | 'DEAD_END' 
  | 'EXCESSIVE_SCROLL' 
  | 'WORKFLOW_EFFICIENCY';

export type SignalSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface UXSignal {
  signalType: SignalType;
  severity: SignalSeverity;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface UXRecommendation {
  title: string;
  description: string;
  evidence: string;
  severity: SignalSeverity;
}

export interface UXScore {
  clarityScore: number;
  efficiencyScore: number;
  smoothnessScore: number;
  overallScore: number;
}

export interface InteractionData {
  id: string;
  type: string;
  target: string;
  metadata?: any;
  timestamp: Date;
}

export interface ActionData {
  id: string;
  action: string;
  target: string;
  value?: string | null;
  status: string;
  stepNumber: number;
  errorMessage?: string | null;
  timestamp: Date;
}

export interface ThoughtData {
  id: string;
  thought: string;
  stepNumber: number;
  timestamp: Date;
}

export interface SessionData {
  id: string;
  goal?: string | null;
  persona?: string | null;
  startedAt?: Date | null;
  endedAt?: Date | null;
  interactions: InteractionData[];
  actions: ActionData[];
  thoughts: ThoughtData[];
}
