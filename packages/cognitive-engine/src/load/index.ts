import { PersonaTraits, VisualElement, CognitiveLoadResult } from '../types';

export class CognitiveLoadEstimator {
  public static calculate(
    traits: PersonaTraits,
    elements: VisualElement[],
    options: {
      stepIndex: number;
      isForm: boolean;
      activeElement?: VisualElement;
      failuresCount: number;
    }
  ): CognitiveLoadResult {
    // 1. Calculate information load based on elements volume and average interaction density (visual noise)
    const elementCount = elements.length;
    const avgDensity = elements.reduce((acc, el) => acc + el.interactionDensity, 0) / (elementCount || 1);
    const informationLoad = Math.min(1.0, (elementCount * 0.1) * 0.4 + avgDensity * 0.6);

    // 2. Calculate interaction load based on active inputs, clutter, and failure recovery attempts
    const isForm = options.isForm;
    const inputCount = elements.filter(el => el.type === 'INPUT').length;
    const baseInteraction = isForm ? 0.4 + (inputCount * 0.1) : 0.2;
    const interactionLoad = Math.min(1.0, baseInteraction + (options.failuresCount * 0.15));

    // 3. Compute mental effort from persona traits and current workflow depth (stepIndex)
    const traitsEffortMultiplier = 1.0 - traits.cognitiveTolerance;
    const mentalEffort = Math.min(
      1.0,
      (interactionLoad * 0.6 + informationLoad * 0.4) * (0.8 + options.stepIndex * 0.08) * (0.7 + traitsEffortMultiplier * 0.5)
    );

    // 4. Aggregate overall cognitive load
    const cognitiveLoad = Math.min(
      1.0,
      (informationLoad * 0.35 + interactionLoad * 0.35 + mentalEffort * 0.3)
    );

    // Determine descriptions based on key load drivers
    let description = 'Cognitive load is within standard threshold limits.';
    if (cognitiveLoad > 0.75) {
      description = `Critical cognitive load detected. Dense layout with visual density (${(informationLoad * 100).toFixed(0)}%) and layout complexity triggers excessive mental effort.`;
    } else if (cognitiveLoad > 0.5) {
      description = `Moderate cognitive fatigue. User is expending mental effort (${(mentalEffort * 100).toFixed(0)}%) reviewing interactive controls and layout density.`;
    } else if (isForm) {
      description = `Form interactions trigger focused mental focus (${(mentalEffort * 100).toFixed(0)}%) to enter details in fields.`;
    }

    return {
      cognitiveLoad,
      mentalEffort,
      informationLoad,
      interactionLoad,
      description,
    };
  }
}
