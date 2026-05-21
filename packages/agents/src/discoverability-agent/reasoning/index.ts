import { ReasoningStep, EmittedSignal } from '../../shared';

export class DiscoverabilityReasoning {
  static evaluate(signals: EmittedSignal[]): ReasoningStep[] {
    const traces: ReasoningStep[] = [];

    traces.push({
      stepType: 'HEURISTIC_EVALUATION',
      summary: 'Analyzed button sizes, action placement proximity, and non-interactive element clicks to measure affordance and prominence.',
      evidence: `Processed ${signals.length} discoverability signals.`
    });

    const competing = signals.find(s => s.signalType === 'COMPETING_ACTION_HIERARCHY');
    const weakCta = signals.find(s => s.signalType === 'WEAK_CTA_SIGNAL');
    const affordance = signals.find(s => s.signalType === 'AFFORDANCE_AMBIGUITY');

    if (competing) {
      traces.push({
        stepType: 'EVIDENCE_CORRELATION',
        summary: `Detected competing primary buttons (${competing.metadata.primaryButtonsCount}) in the same view area.`,
        evidence: 'Multiple highly styled elements draw attention away from the actual primary action step.'
      });
    }

    if (weakCta) {
      traces.push({
        stepType: 'EVIDENCE_CORRELATION',
        summary: `Flagged a CTA with insufficient layout dimensions: ${weakCta.metadata.details}.`,
        evidence: 'Buttons that fall below standard size thresholds have weak visual weights, impeding user discoverability.'
      });
    }

    if (affordance) {
      traces.push({
        stepType: 'EVIDENCE_CORRELATION',
        summary: 'Detected user clicking on static layout containers or non-interactive headings.',
        evidence: 'Clicking plain text headers suggests users mistake labels/titles for active buttons or routes.'
      });
    }

    return traces;
  }
}
export default DiscoverabilityReasoning;
