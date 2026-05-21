import { ReasoningStep, EmittedSignal } from '../../shared';

export class OnboardingReasoning {
  static evaluate(signals: EmittedSignal[]): ReasoningStep[] {
    const traces: ReasoningStep[] = [];

    traces.push({
      stepType: 'HEURISTIC_EVALUATION',
      summary: 'Audited landing page layouts, initial action delays, and empty state templates for onboarding guidance.',
      evidence: `Processed ${signals.length} active onboarding signals.`
    });

    const guidance = signals.find(s => s.signalType === 'MISSING_GUIDANCE_SIGNAL');
    const emptyState = signals.find(s => s.signalType === 'EMPTY_STATE_FRICTION');
    const hesitation = signals.find(s => s.signalType === 'ONBOARDING_HESITATION');

    if (guidance) {
      traces.push({
        stepType: 'EVIDENCE_CORRELATION',
        summary: 'Flagged absence of tutorial blocks, helper tooltips, or banners on the first page viewport.',
        evidence: 'A first-time user landing on an empty dashboard needs guides or checklists to trigger their first action.'
      });
    }

    if (emptyState) {
      traces.push({
        stepType: 'EVIDENCE_CORRELATION',
        summary: `Detected empty state elements on initial dashboard/workspace route: ${emptyState.metadata.pageUrl}.`,
        evidence: 'If an empty state does not feature a prominent call-to-action button, users stall or hesitate.'
      });
    }

    if (hesitation) {
      traces.push({
        stepType: 'EVIDENCE_CORRELATION',
        summary: `Confirmed onboarding hesitation: first step took ${hesitation.metadata.firstStepDurationSeconds} seconds.`,
        evidence: 'High initial time-on-page indicates lack of visual clarity regarding the primary onboarding driver.'
      });
    }

    return traces;
  }
}
export default OnboardingReasoning;
