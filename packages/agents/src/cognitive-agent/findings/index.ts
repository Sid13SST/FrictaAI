import { StructuredFinding, EmittedSignal } from '../../shared';

export class CognitiveFindings {
  static compile(signals: EmittedSignal[]): StructuredFinding[] {
    const findings: StructuredFinding[] = [];

    const overload = signals.find(s => s.signalType === 'COGNITIVE_OVERLOAD');
    const fatigue = signals.find(s => s.signalType === 'DECISION_FATIGUE');
    const density = signals.find(s => s.signalType === 'WORKFLOW_DENSITY');
    const complexity = signals.find(s => s.signalType === 'EXCESSIVE_STEP_COMPLEXITY');

    if (overload && overload.intensity > 0.5) {
      findings.push({
        findingType: 'COGNITIVE_OVERLOAD',
        severity: 'HIGH',
        title: 'Cognitive Overload Detected',
        description: 'User exhibited signs of hesitation and uncertainty while navigating the application layout, indicating mental friction.',
        evidence: `Detected ${overload.metadata.hesitantThoughts} hesitant thoughts and ${overload.metadata.totalSteps} steps in the workflow session.`
      });
    }

    if (fatigue && fatigue.intensity > 0.5) {
      findings.push({
        findingType: 'DECISION_FATIGUE',
        severity: 'MEDIUM',
        title: 'User Choice Decision Fatigue',
        description: 'The user completed a long series of selection changes or form toggles in rapid succession, which can cause choice exhaustion.',
        evidence: `Completed a continuous sequence of ${fatigue.metadata.consecutiveDecisions} choices/selections without intermediate pages.`
      });
    }

    if (density && density.intensity > 0.5) {
      findings.push({
        findingType: 'WORKFLOW_DENSITY',
        severity: 'MEDIUM',
        title: 'Excessive Input Density',
        description: 'Layout exhibits very high density of inputs and control elements, which increases cognitive load and search times.',
        evidence: `Max of ${density.metadata.maxInputsInSingleView} inputs detected in a single screen region.`
      });
    }

    if (complexity && complexity.intensity > 0.6) {
      findings.push({
        findingType: 'EXCESSIVE_STEP_COMPLEXITY',
        severity: 'HIGH',
        title: 'Excessive Workflow Step Complexity',
        description: 'The task required an unusually large number of interactive steps, pointing to potential workflow over-complication.',
        evidence: `Task execution comprised ${complexity.metadata.totalStepCount} steps in total.`
      });
    }

    return findings;
  }
}
export default CognitiveFindings;
