import { PersonaTraits, VisualElement, TrustUncertaintyResult } from '../types';

export class UsabilityTrustEstimator {
  public static calculate(
    traits: PersonaTraits,
    activeElement: VisualElement,
    failuresCount: number
  ): TrustUncertaintyResult {
    const selector = activeElement.selector.toLowerCase();
    const text = activeElement.text.toLowerCase();

    // 1. Compute baseline suspicion score based on ctaTrustLevel trait
    let suspicionScore = Math.max(0.0, 1.0 - traits.ctaTrustLevel);

    // 2. Escalate suspicion if clicking potentially risky, ambiguous, or banner-like elements
    if (selector.includes('banner') || selector.includes('ad') || text.includes('sponsored')) {
      suspicionScore = Math.min(1.0, suspicionScore + 0.35);
    }
    if (activeElement.type === 'LINK' && activeElement.contrastStrength < 0.45) {
      suspicionScore = Math.min(1.0, suspicionScore + 0.15);
    }

    // 3. Confirmation anxiety is triggered by action failures or complex inputs
    let anxietyLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    const anxietyValue = suspicionScore * 0.4 + (failuresCount * 0.3);
    if (anxietyValue > 0.65) {
      anxietyLevel = 'HIGH';
    } else if (anxietyValue > 0.35) {
      anxietyLevel = 'MEDIUM';
    }

    let description = 'User interacts with standard trust index.';
    if (anxietyLevel === 'HIGH') {
      description = `High confirmation anxiety triggered. Suspicion weight is high (${(suspicionScore * 100).toFixed(0)}%) due to UI anomalies or repeated interaction failures.`;
    } else if (anxietyLevel === 'MEDIUM') {
      description = `Moderate uncertainty. Low CTA trust weight increases hesitation prior to committing to interactions.`;
    }

    return {
      suspicionScore,
      anxietyLevel,
      description,
    };
  }
}
