import { BaseAgent, AgentAnalysisOutput } from '../../shared';
import { WorkflowSignals } from '../signals';
import { WorkflowReasoning } from '../reasoning';
import { WorkflowFindings } from '../findings';

export class WorkflowAgent implements BaseAgent {
  public readonly agentType = 'WORKFLOW_AGENT';

  async execute(sessionData: any): Promise<AgentAnalysisOutput> {
    const signals = WorkflowSignals.compute(sessionData);
    const reasoningTraces = WorkflowReasoning.evaluate(signals);
    const findings = WorkflowFindings.compile(signals);

    return {
      findings,
      signals,
      reasoningTraces
    };
  }
}
export default WorkflowAgent;
