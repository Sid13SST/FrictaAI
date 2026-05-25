import { PersonaTraits } from '../types';

export type UserIntent = 'FORM_FILLING' | 'BROWSE_NAVIGATION' | 'SYSTEM_ABANDONMENT' | 'SEEKING_HELP' | 'ERROR_RECOVERY' | 'HESITATION_SCANNING';

export class IntentEngine {
  /**
   * Calculates next intent transitions based on traits, confidence, and current state.
   */
  public static transition(
    currentIntent: UserIntent,
    traits: PersonaTraits,
    confidence: number,
    failuresCount: number,
    options?: { hasFormOnPage?: boolean; hasHelpLink?: boolean }
  ): UserIntent {
    // 1. Check for abandonment condition
    if (failuresCount > 2 && traits.explorationPatience < 0.4 && confidence < 0.25) {
      return 'SYSTEM_ABANDONMENT';
    }

    // 2. Check for help-seeking condition
    if (failuresCount > 1 && options?.hasHelpLink && traits.ctaTrustLevel > 0.4 && confidence < 0.4) {
      return 'SEEKING_HELP';
    }

    // 3. Check for recovery after form error
    if (currentIntent === 'FORM_FILLING' && failuresCount > 0) {
      return 'ERROR_RECOVERY';
    }

    // 4. Default transitions
    switch (currentIntent) {
      case 'BROWSE_NAVIGATION':
        if (options?.hasFormOnPage && traits.formConfidence > 0.3) {
          return 'FORM_FILLING';
        }
        if (confidence < 0.35) {
          return 'HESITATION_SCANNING';
        }
        return 'BROWSE_NAVIGATION';

      case 'HESITATION_SCANNING':
        if (confidence > 0.5) {
          return 'BROWSE_NAVIGATION';
        }
        return 'HESITATION_SCANNING';

      case 'FORM_FILLING':
        if (!options?.hasFormOnPage) {
          return 'BROWSE_NAVIGATION';
        }
        return 'FORM_FILLING';

      case 'ERROR_RECOVERY':
        if (failuresCount === 0) {
          return options?.hasFormOnPage ? 'FORM_FILLING' : 'BROWSE_NAVIGATION';
        }
        return 'ERROR_RECOVERY';

      default:
        return 'BROWSE_NAVIGATION';
    }
  }
}
