import { AbandonmentInput } from '../types';

export class AbandonmentPredictor {
  public static calculate(
    stepsCount: number,
    baseFriction: number,
    traits: any
  ): AbandonmentInput[] {
    const predictions: AbandonmentInput[] = [];

    for (let stepIndex = 0; stepIndex < stepsCount; stepIndex++) {
      // Probability compounds over sequential steps, scaled by user fatigue (patience / cognitive tolerance)
      const cognitiveLoadEscalation = Math.min(1.0, 0.3 + stepIndex * 0.12 * (1.0 - traits.cognitiveTolerance));
      const confidenceCollapseProbability = Math.min(1.0, 0.1 + stepIndex * 0.15 * (1.0 - traits.navigationConfidence));
      const retryDensityImpact = stepIndex > 2 ? 0.45 : 0.15;
      const hesitationAccumulationMs = Math.round((1.0 - traits.formConfidence) * 1200 + stepIndex * 400);

      const abandonmentProbability = Math.min(
        0.95,
        Math.max(
          0.05,
          (cognitiveLoadEscalation * 0.4 + confidenceCollapseProbability * 0.4 + retryDensityImpact * 0.2) * (1.1 - traits.explorationPatience)
        )
      );

      let description = `Step ${stepIndex + 1}: Stable. Navigation confidence is standard.`;
      let triggerSource = 'STANDARD_FLOW';

      if (abandonmentProbability > 0.7) {
        description = `Step ${stepIndex + 1}: Critical warning. Highly elevated risk of abandonment due to decision fatigue and confidence collapse.`;
        triggerSource = 'CONFIDENCE_DEGRADATION';
      } else if (abandonmentProbability > 0.4) {
        description = `Step ${stepIndex + 1}: Moderate warning. Accumulated hesitation has reached warning thresholds.`;
        triggerSource = 'HESITATION_ACCUMULATION';
      }

      predictions.push({
        stepIndex,
        abandonmentProbability,
        triggerSource,
        cognitiveLoadEscalation,
        confidenceCollapseProbability,
        retryDensityImpact,
        hesitationAccumulationMs,
        description,
      });
    }

    return predictions;
  }
}
