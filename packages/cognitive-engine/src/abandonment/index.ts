import { PersonaTraits, AbandonmentRiskResult } from '../types';

export class AbandonmentRiskEstimator {
  public static calculate(
    traits: PersonaTraits,
    cognitiveLoad: number,
    confidence: number,
    failuresCount: number,
    stepIndex: number
  ): AbandonmentRiskResult {
    // 1. Calculate accumulated friction over steps and failures
    const frictionAccumulated = Math.min(
      1.0,
      (cognitiveLoad * 0.3) + ((1.0 - confidence) * 0.3) + (failuresCount * 0.2) + (stepIndex * 0.04)
    );

    // 2. Persona impatience scales up the base risk
    const impatience = 1.0 - traits.explorationPatience;
    const riskProbability = Math.min(
      1.0,
      frictionAccumulated * (0.7 + impatience * 0.6)
    );

    // 3. Determine the primary risk driver/source
    let triggerSource = 'STABLE_WORKFLOW';
    let description = 'Abandonment probability is low. User persists along target exploration path.';

    if (riskProbability > 0.75) {
      triggerSource = failuresCount > 1 ? 'RETRY_FREQUENCY_ABORT' : 'COGNITIVE_OVERLOAD_ABORT';
      description = `Critical risk of session abort. High cognitive fatigue and consecutive failures (${failuresCount}) exceed user exploration patience.`;
    } else if (riskProbability > 0.45) {
      if (1.0 - confidence > 0.5) {
        triggerSource = 'CONFIDENCE_DEGRADATION';
        description = `Elevated abandonment risk. Low confidence (${(confidence * 100).toFixed(0)}%) triggers exploration hesitation.`;
      } else {
        triggerSource = 'EXPLORATION_FATIGUE';
        description = `Moderate abandonment warning. Continuous visual search without successful CTA validation increases exhaustion.`;
      }
    }

    return {
      riskProbability,
      triggerSource,
      frictionAccumulated,
      description,
    };
  }
}
