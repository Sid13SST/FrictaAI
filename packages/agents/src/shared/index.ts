export interface StructuredFinding {
  findingType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  evidence: string;
  correlatedFindings?: string[];
}

export interface EmittedSignal {
  signalType: string;
  intensity: number; // 0.0 to 1.0
  metadata?: any;
}

export interface ReasoningStep {
  stepType: string;
  summary: string;
  evidence?: string;
}

export interface AgentAnalysisOutput {
  findings: StructuredFinding[];
  signals: EmittedSignal[];
  reasoningTraces: ReasoningStep[];
}

export interface BaseAgent {
  agentType: string;
  execute(sessionData: any): Promise<AgentAnalysisOutput>;
}
