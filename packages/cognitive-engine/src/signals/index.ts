import { VisualElement } from '../types';

export class CognitiveSignalHelpers {
  /**
   * Calculates overall visual noise density across all layout elements.
   */
  public static calculateVisualNoise(elements: VisualElement[]): number {
    if (elements.length === 0) return 0;
    const totalDensity = elements.reduce((acc, el) => acc + el.interactionDensity, 0);
    return Math.min(1.0, totalDensity / elements.length);
  }

  /**
   * Evaluates the layout focus competition (ratio of buttons/inputs vs static texts).
   */
  public static calculateFocusCompetition(elements: VisualElement[]): number {
    if (elements.length === 0) return 0;
    const interactive = elements.filter(el => el.type === 'BUTTON' || el.type === 'INPUT' || el.type === 'LINK').length;
    return Math.min(1.0, interactive / elements.length);
  }
}
