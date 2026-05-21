import { BaseAgent, AgentAnalysisOutput } from '../../shared';
import { CognitiveSignals } from '../signals';
import { CognitiveReasoning } from '../reasoning';
import { CognitiveFindings } from '../findings';

export class CognitiveAgent implements BaseAgent {
  public readonly agentType = 'COGNITIVE_AGENT';

  async execute(sessionData: any): Promise<AgentAnalysisOutput> {
    const signals = CognitiveSignals.compute(sessionData);
    const reasoningTraces = CognitiveReasoning.evaluate(signals);
    const findings = CognitiveFindings.compile(signals);

    return {
      findings,
      signals,
      reasoningTraces
    };
  }
}
export default CognitiveAgent;
