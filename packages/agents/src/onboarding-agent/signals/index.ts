import { EmittedSignal } from '../../shared';
import { OnboardingHeuristics } from '../heuristics';

export class OnboardingSignals {
  static compute(sessionData: any): EmittedSignal[] {
    const signals: EmittedSignal[] = [];
    const actions = sessionData.actions || [];
    const screenshots = sessionData.screenshots || [];

    // 1. Missing Guidance
    const missingGuidance = OnboardingHeuristics.detectMissingGuidance(screenshots);
    if (missingGuidance) {
      signals.push({
        signalType: 'MISSING_GUIDANCE_SIGNAL',
        intensity: 0.8,
        metadata: { checkedScreenshots: screenshots.length }
      });
    }

    // 2. Empty State Friction
    const emptyState = OnboardingHeuristics.detectEmptyStateFriction(screenshots);
    if (emptyState) {
      // Check if user stalled on empty state (e.g. action count < 3)
      signals.push({
        signalType: 'EMPTY_STATE_FRICTION',
        intensity: 0.7,
        metadata: { pageUrl: screenshots[0]?.pageUrl || 'landing' }
      });
    }

    // 3. Onboarding Hesitation
    const firstStepTime = OnboardingHeuristics.detectFirstActionHesitation(actions);
    if (firstStepTime > 15) {
      signals.push({
        signalType: 'ONBOARDING_HESITATION',
        intensity: Math.min(1.0, 0.4 + (firstStepTime - 15) * 0.02),
        metadata: { firstStepDurationSeconds: firstStepTime }
      });
    }

    // 4. First-Action Ambiguity
    // Triggers if the first action is a click or navigation back-and-forth
    if (actions.length > 2) {
      const a0 = actions[0].action;
      const a1 = actions[1].action;
      if (a0 === 'navigate' && a1 === 'navigate') {
        signals.push({
          signalType: 'FIRST_ACTION_AMBIGUITY',
          intensity: 0.75,
          metadata: { initialActions: [a0, a1] }
        });
      }
    }

    return signals;
  }
}
