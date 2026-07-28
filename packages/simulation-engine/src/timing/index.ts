import { PersonaTraits } from '../types';

export class TimingEngine {
  /**
   * Calculates simulated action latency based on layout density, action type, and persona traits.
   */
  public static calculateDelay(
    actionType: 'CLICK' | 'HOVER' | 'SCAN' | 'BACKTRACK' | 'INPUT' | 'PAUSE',
    traits: PersonaTraits,
    options?: { elementClutter?: number; textLength?: number }
  ): number {
    const clutterMultiplier = 1 + (options?.elementClutter || 0) * 0.5; // Up to 1.5x slower for cluttered UI
    let baseDelay = 1000;

    switch (actionType) {
      case 'CLICK':
        // power users click instantly; beginners hesitate
        baseDelay = 800 + (1 - traits.formConfidence) * 1200;
        break;
      case 'HOVER':
        baseDelay = 300 + (1 - traits.navigationConfidence) * 900;
        break;
      case 'SCAN':
        // scanning takes time if the page is dense or if they are slow readers
        baseDelay = 1200 * clutterMultiplier * (traits.readingDepth + 0.2);
        break;
      case 'BACKTRACK':
        baseDelay = 1500 * (2 - traits.explorationPatience);
        break;
      case 'INPUT': {
        // input speed scales inversely with formConfidence
        const textCount = options?.textLength || 10;
        baseDelay = textCount * (100 + (1 - traits.formConfidence) * 300);
        break;
      }
      case 'PAUSE':
        baseDelay = 2000 * (traits.readingDepth + 0.5);
        break;
    }

    return Math.floor(Math.max(200, baseDelay));
  }
}
