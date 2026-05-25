import { PersonaTraits, VisualElement, AttentionEventResult } from '../types';

export class AttentionHierarchyEstimator {
  public static calculate(
    traits: PersonaTraits,
    elements: VisualElement[],
    activeElement: VisualElement
  ): AttentionEventResult {
    // 1. Calculate visibility weight based on active element properties
    const visibilityWeight = Math.min(
      1.0,
      activeElement.ctaProminence * 0.6 + activeElement.contrastStrength * 0.4
    );

    // 2. Focus heat describes user attention allocation, reduced by layout clutter (interactionDensity)
    const focusHeat = Math.min(
      1.0,
      visibilityWeight * (1.0 - activeElement.interactionDensity * 0.4)
    );

    // 3. Content overload triggers if choice volume is high and average page clutter exceeds threshold
    const totalCount = elements.length;
    const avgDensity = elements.reduce((acc, el) => acc + el.interactionDensity, 0) / (totalCount || 1);
    const overloadDetected = totalCount > 4 && avgDensity > 0.45;

    // Describe what user is noticing vs missing
    let description = `User focus allocated on "${activeElement.text}" (${(focusHeat * 100).toFixed(0)}% focus strength).`;
    if (overloadDetected) {
      description += ` Alert: High layouts complexity causes focus competition; secondary buttons risk being missed by user.`;
    } else if (visibilityWeight < 0.4) {
      description += ` Target element has low prominence, risking low discoverability.`;
    } else {
      description += ` Clear visual hierarchy ensures immediate focal alignment.`;
    }

    return {
      visibilityWeight,
      focusHeat,
      overloadDetected,
      description,
    };
  }
}
