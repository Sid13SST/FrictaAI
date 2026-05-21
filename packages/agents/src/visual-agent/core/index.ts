import { BaseAgent, AgentAnalysisOutput } from '../../shared';
import { VisualSignals } from '../signals';
import { VisualReasoning } from '../reasoning';
import { VisualFindings } from '../findings';

export class VisualAgent implements BaseAgent {
  public readonly agentType = 'VISUAL_AGENT';

  async execute(sessionData: any): Promise<AgentAnalysisOutput> {
    const signals = VisualSignals.compute(sessionData);
    const reasoningTraces = VisualReasoning.evaluate(signals);
    const findings = VisualFindings.compile(signals);

    return {
      findings,
      signals,
      reasoningTraces
    };
  }
}
export default VisualAgent;
