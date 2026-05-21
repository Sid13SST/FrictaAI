import { ReasoningStep, EmittedSignal } from '../../shared';

export class WorkflowReasoning {
  static evaluate(signals: EmittedSignal[]): ReasoningStep[] {
    const traces: ReasoningStep[] = [];

    traces.push({
      stepType: 'WORKFLOW_EFFICIENCY_AUDIT',
      summary: 'Audited user action stream and overall session duration metadata to calculate path loops, redundancies, and time bottlenecks.',
      evidence: `Processed ${signals.length} workflow-level signals.`
    });

    const redundancy = signals.find(s => s.signalType === 'STEP_REDUNDANCY');
    const bottleneck = signals.find(s => s.signalType === 'WORKFLOW_BOTTLENECK');
    const steps = signals.find(s => s.signalType === 'EXCESSIVE_WORKFLOW_STEPS');

    if (redundancy) {
      traces.push({
        stepType: 'EVIDENCE_CORRELATION',
        summary: `Identified redundant steps. User repeated click interactions on the same target elements multiple times.`,
        evidence: `Repeated targets: ${redundancy.metadata.redundantTargets.join(', ')}`
      });
    }

    if (bottleneck) {
      traces.push({
        stepType: 'EVIDENCE_CORRELATION',
        summary: `Identified task bottlenecks: ${bottleneck.metadata.reason}`,
        evidence: `Average interaction time was ${bottleneck.metadata.avgStepDuration.toFixed(1)} seconds, indicating the user struggled or waited on slow processes.`
      });
    }

    if (steps) {
      traces.push({
        stepType: 'EVIDENCE_CORRELATION',
        summary: `Identified sub-optimal flow length with ${steps.metadata.stepCount} interactions.`,
        evidence: 'Exceeding 15 steps for standard target outcomes indicates a high-interaction tax, requiring streamlined path routing.'
      });
    }

    return traces;
  }
}
export default WorkflowReasoning;
