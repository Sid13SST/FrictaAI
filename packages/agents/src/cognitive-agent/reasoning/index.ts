import { ReasoningStep, EmittedSignal } from '../../shared';

export class CognitiveReasoning {
  static evaluate(signals: EmittedSignal[]): ReasoningStep[] {
    const traces: ReasoningStep[] = [];

    traces.push({
      stepType: 'HEURISTIC_EVALUATION',
      summary: 'Audited user thought logs, form field density, and choice chains to calculate hesitation indices and mental fatigue.',
      evidence: `Processed ${signals.length} cognitive friction signals.`
    });

    const overload = signals.find(s => s.signalType === 'COGNITIVE_OVERLOAD');
    const fatigue = signals.find(s => s.signalType === 'DECISION_FATIGUE');
    const density = signals.find(s => s.signalType === 'WORKFLOW_DENSITY');

    if (overload) {
      traces.push({
        stepType: 'EVIDENCE_CORRELATION',
        summary: `Detected cognitive overload containing ${overload.metadata.hesitantThoughts} hesitant thoughts and ${overload.metadata.totalSteps} execution steps.`,
        evidence: 'Expressing uncertainty or questioning step paths indicates that the interface introduces excessive workflow branching.'
      });
    }

    if (fatigue) {
      traces.push({
        stepType: 'EVIDENCE_CORRELATION',
        summary: `Identified user decision fatigue: clicked ${fatigue.metadata.consecutiveDecisions} choices/toggles in sequence.`,
        evidence: 'Exposing too many adjacent select dropdowns, options, or checkboxes causes user choice paralysis.'
      });
    }

    if (density) {
      traces.push({
        stepType: 'EVIDENCE_CORRELATION',
        summary: `Flagged dense workflow screen layout: detected ${density.metadata.maxInputsInSingleView} inputs in a single view region.`,
        evidence: 'High input density increases friction for beginner or standard personas, suggesting form partitioning is needed.'
      });
    }

    return traces;
  }
}
export default CognitiveReasoning;
