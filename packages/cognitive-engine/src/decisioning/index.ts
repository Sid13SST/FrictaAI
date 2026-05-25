import { PersonaTraits, VisualElement, DecisionComplexityResult } from '../types';

export class DecisionComplexityEstimator {
  public static calculate(
    traits: PersonaTraits,
    elements: VisualElement[]
  ): DecisionComplexityResult {
    const choiceCount = elements.length;

    // 1. Ambiguity score climbs if there are no highly prominent CTAs on page
    const maxProminence = elements.reduce((max, el) => Math.max(max, el.ctaProminence), 0);
    const ambiguityScore = Math.max(0.0, 1.0 - maxProminence);

    // 2. Next action clarity measures if there is a clear focal option vs multiple similar options
    const sortedProminence = [...elements].map(el => el.ctaProminence).sort((a, b) => b - a);
    const primaryProminence = sortedProminence[0] || 0;
    const secondaryProminence = sortedProminence[1] || 0;
    const nextActionClarity = Math.max(0.1, primaryProminence - secondaryProminence * 0.5);

    // 3. Complexity Level categorizations
    let complexityLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (choiceCount > 5 && ambiguityScore > 0.4) {
      complexityLevel = 'HIGH';
    } else if (choiceCount > 3 || ambiguityScore > 0.25) {
      complexityLevel = 'MEDIUM';
    }

    let description = 'Clean choices hierarchy; next action contains clear visual affordance.';
    if (complexityLevel === 'HIGH') {
      description = `Choice overload detected (${choiceCount} options). Ambiguity is high (${(ambiguityScore * 100).toFixed(0)}%) due to lack of distinct layout hierarchy.`;
    } else if (complexityLevel === 'MEDIUM') {
      description = `Moderate decision complexity. User has ${choiceCount} controls to evaluate with average visual distinction.`;
    }

    return {
      choiceCount,
      ambiguityScore,
      complexityLevel,
      nextActionClarity,
      description,
    };
  }
}
