import { PersonaTraits } from '../types';

export interface SimulatedHesitation {
  signalType: 'HOVER_HESITATION' | 'REPEATED_SCANNING' | 'DELAYED_CLICKING' | 'CURSOR_DRIFT' | 'FORM_FIELD_UNCERTAINTY';
  durationMs: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  targetElement?: string;
}

export class HesitationSimulator {
  /**
   * Generates a hesitation signal if conditions match layout complexity vs user confidence.
   */
  public static simulate(
    traits: PersonaTraits,
    confidence: number,
    options?: { elementClutter?: number; isForm?: boolean }
  ): SimulatedHesitation | null {
    const clutter = options?.elementClutter || 0.2;
    const isForm = options?.isForm || false;

    // Likelihood of hesitating increases if confidence is low, traits have low confidence, or page has clutter
    const hesitationLikelihood = (1 - confidence) * 0.5 + (1 - traits.navigationConfidence) * 0.3 + clutter * 0.2;

    if (hesitationLikelihood < 0.4) {
      return null;
    }

    const duration = Math.floor(600 + (1 - confidence) * 2000 + clutter * 1000);
    const severity = hesitationLikelihood > 0.8 ? 'HIGH' : hesitationLikelihood > 0.55 ? 'MEDIUM' : 'LOW';

    if (isForm && traits.formConfidence < 0.5) {
      return {
        signalType: 'FORM_FIELD_UNCERTAINTY',
        durationMs: duration,
        severity,
        description: 'User hesitated while filling out form inputs, re-verifying characters.',
      };
    }

    if (traits.attentionStability < 0.4) {
      return {
        signalType: 'CURSOR_DRIFT',
        durationMs: duration,
        severity,
        description: 'Cursor drifted aimlessly due to skim reading or distraction.',
      };
    }

    if (clutter > 0.5) {
      return {
        signalType: 'REPEATED_SCANNING',
        durationMs: duration,
        severity,
        description: 'Dense screen layout caused repeated visual scanning loops to find CTA.',
      };
    }

    return {
      signalType: 'HOVER_HESITATION',
      durationMs: duration,
      severity,
      description: 'Hover hesitation occurred prior to committing to click the target element.',
    };
  }
}
