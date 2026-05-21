import { BaseAgent, AgentAnalysisOutput } from '../../shared';
import { OnboardingSignals } from '../signals';
import { OnboardingReasoning } from '../reasoning';
import { OnboardingFindings } from '../findings';

export class OnboardingAgent implements BaseAgent {
  public readonly agentType = 'ONBOARDING_AGENT';

  async execute(sessionData: any): Promise<AgentAnalysisOutput> {
    const signals = OnboardingSignals.compute(sessionData);
    const reasoningTraces = OnboardingReasoning.evaluate(signals);
    const findings = OnboardingFindings.compile(signals);

    return {
      findings,
      signals,
      reasoningTraces
    };
  }
}
export default OnboardingAgent;
