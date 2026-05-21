import { BaseAgent, AgentAnalysisOutput } from '../../shared';
import { NavigationSignals } from '../signals';
import { NavigationReasoning } from '../reasoning';
import { NavigationFindings } from '../findings';

export class NavigationAgent implements BaseAgent {
  public readonly agentType = 'NAVIGATION_AGENT';

  async execute(sessionData: any): Promise<AgentAnalysisOutput> {
    // 1. Compute Signals
    const signals = NavigationSignals.compute(sessionData);

    // 2. Perform Reasoning
    const reasoningTraces = NavigationReasoning.evaluate(signals);

    // 3. Compile Findings
    const findings = NavigationFindings.compile(signals);

    return {
      findings,
      signals,
      reasoningTraces
    };
  }
}
export default NavigationAgent;
