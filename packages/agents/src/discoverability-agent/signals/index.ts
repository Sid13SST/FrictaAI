import { EmittedSignal } from '../../shared';
import { DiscoverabilityHeuristics } from '../heuristics';

export class DiscoverabilitySignals {
  static compute(sessionData: any): EmittedSignal[] {
    const signals: EmittedSignal[] = [];
    const interactions = sessionData.interactions || [];
    const screenshots = sessionData.screenshots || [];
    const actions = sessionData.actions || [];

    // 1. Competing Action Hierarchy
    const competing = DiscoverabilityHeuristics.detectCompetingHierarchy(screenshots);
    if (competing.competing) {
      signals.push({
        signalType: 'COMPETING_ACTION_HIERARCHY',
        intensity: 0.75,
        metadata: { primaryButtonsCount: competing.count }
      });
    }

    // 2. Weak CTA Signal
    const weakCta = DiscoverabilityHeuristics.detectWeakCTA(screenshots);
    if (weakCta.weak) {
      signals.push({
        signalType: 'WEAK_CTA_SIGNAL',
        intensity: 0.8,
        metadata: { details: weakCta.details }
      });
    }

    // 3. Affordance Ambiguity
    const ambiguity = DiscoverabilityHeuristics.detectAffordanceAmbiguity(interactions);
    if (ambiguity) {
      signals.push({
        signalType: 'AFFORDANCE_AMBIGUITY',
        intensity: 0.7,
        metadata: { clickLogCount: interactions.length }
      });
    }

    // 4. Hidden Feature Signal
    // Triggers if the user performs searches/menu toggles before executing a primary action
    const searchClicks = actions.filter((a: any) => 
      a.action === 'click' && 
      ((a.target || '').toLowerCase().includes('search') || (a.target || '').toLowerCase().includes('menu') || (a.target || '').toLowerCase().includes('filter'))
    ).length;
    
    if (searchClicks >= 3) {
      signals.push({
        signalType: 'HIDDEN_FEATURE_SIGNAL',
        intensity: 0.85,
        metadata: { menuToggles: searchClicks }
      });
    }

    return signals;
  }
}
export default DiscoverabilitySignals;
