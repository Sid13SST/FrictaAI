import { PersonaTraits } from '../types';

export interface VisualElement {
  selector: string;
  type: 'BUTTON' | 'LINK' | 'INPUT' | 'SELECT' | 'TEXT_BLOCK';
  text: string;
  ctaProminence: number;      // 0.0 to 1.0
  contrastStrength: number;   // 0.0 to 1.0
  interactionDensity: number; // 0.0 to 1.0
}

export interface RankedDecision {
  element: VisualElement;
  weight: number;
  reason: string;
}

export class VisualDecisionEngine {
  /**
   * Evaluates available elements and ranks them based on visual affordances and user traits.
   */
  public static rankElements(
    elements: VisualElement[],
    traits: PersonaTraits,
    confidence: number
  ): RankedDecision[] {
    return elements
      .map((el) => {
        let weight = 0;
        let reasonStr = 'Visual affordance scanning.';

        // 1. High contrast / CTA prominence attracts attention
        if (el.ctaProminence > 0.5) {
          const trustBonus = traits.ctaTrustLevel * 20;
          weight += el.ctaProminence * 30 + trustBonus;
          reasonStr = 'High contrast CTA attracted user attention.';
        }

        // 2. Links vs Form fields
        if (el.type === 'INPUT' || el.type === 'SELECT') {
          // input elements are prioritized if user is filling forms
          weight += traits.formConfidence * 25;
          reasonStr = 'Interactive form element identified.';
        } else if (el.type === 'LINK') {
          weight += confidence * 20;
          reasonStr = 'Navigational link identified during scan.';
        }

        // 3. Contrast strength multiplier
        weight += el.contrastStrength * 15;

        // 4. Cluttered areas reduce visual weight for beginners
        if (el.interactionDensity > 0.6) {
          const densityPenalty = (1 - traits.navigationConfidence) * 15;
          weight -= el.interactionDensity * densityPenalty;
        }

        // Add small random noise for organic variation
        weight += Math.random() * 5;

        return {
          element: el,
          weight: Math.max(0, weight),
          reason: reasonStr,
        };
      })
      .sort((a, b) => b.weight - a.weight);
  }
}
