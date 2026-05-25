import { SurvivabilityInput } from '../types';

export class SurvivabilityPredictor {
  public static calculate(
    personas: Array<{ displayName: string; traits: any }>
  ): SurvivabilityInput[] {
    const forecasts: SurvivabilityInput[] = [];

    for (const persona of personas) {
      const { displayName, traits } = persona;
      
      // Calculate predicted parameters using archetype patience and confidence traits
      const predictedSurvivalRate = Math.min(1.0, Math.max(0.1, traits.navigationConfidence * 0.7 + traits.explorationPatience * 0.3));
      const estimatedStepsToAbandon = Math.round(3 + traits.explorationPatience * 4);

      let primaryAbandonmentTrigger = 'CONFIDENCE_DEGRADATION';
      let riskFactors: string[] = [];

      if (displayName.includes('Impatient')) {
        primaryAbandonmentTrigger = 'LATENCY_INTOLERANCE';
        riskFactors = ['Low patience threshold', 'Slow form feedback loops'];
      } else if (displayName.includes('Distracted')) {
        primaryAbandonmentTrigger = 'ATTENTION_DRIFT';
        riskFactors = ['High scan loop count', 'Banner distraction weight'];
      } else if (displayName.includes('Power User')) {
        primaryAbandonmentTrigger = 'CLUTTER_ABANDONMENT';
        riskFactors = ['Impatient flow pacing', 'Visual choice overloading'];
      } else if (displayName.includes('Beginner')) {
        primaryAbandonmentTrigger = 'VALIDATION_FRUSTRATION';
        riskFactors = ['Form submission validation loops', 'Unclear error highlights'];
      } else {
        riskFactors = ['General navigation complexity', 'Hesitation patterns'];
      }

      forecasts.push({
        personaType: displayName,
        predictedSurvivalRate,
        estimatedStepsToAbandon,
        primaryAbandonmentTrigger,
        riskFactors,
      });
    }

    return forecasts;
  }
}
