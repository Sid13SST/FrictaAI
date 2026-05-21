import { BaseAgent, AgentAnalysisOutput } from '../../shared';
import { DiscoverabilitySignals } from '../signals';
import { DiscoverabilityReasoning } from '../reasoning';
import { DiscoverabilityFindings } from '../findings';

export class DiscoverabilityAgent implements BaseAgent {
  public readonly agentType = 'DISCOVERABILITY_AGENT';

  async execute(sessionData: any): Promise<AgentAnalysisOutput> {
    const signals = DiscoverabilitySignals.compute(sessionData);
    const reasoningTraces = DiscoverabilityReasoning.evaluate(signals);
    const findings = DiscoverabilityFindings.compile(signals);

    return {
      findings,
      signals,
      reasoningTraces
    };
  }
}
export default DiscoverabilityAgent;
