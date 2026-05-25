import { PersonaTraits } from '../types';

export interface SimulatedFrictionReaction {
  reactionType: 'ABANDONMENT_RISK' | 'EXPLORATION_SLOWDOWN' | 'RETRY_HESITATION' | 'CONFIDENCE_REDUCTION' | 'SCAN_INCREASE';
  intensity: number;
  description: string;
}

export class FrictionResponseEngine {
  /**
   * Evaluates user friction reaction to layout friction alerts.
   */
  public static evaluate(
    traits: PersonaTraits,
    confidence: number,
    frictionType: string,
    severity: string
  ): SimulatedFrictionReaction | null {
    // Beginner users trigger reactions at lower friction levels compared to power users
    const threshold = traits.cognitiveTolerance * 0.7 + confidence * 0.3;
    const frictionValue = severity === 'CRITICAL' ? 0.9 : severity === 'HIGH' ? 0.7 : severity === 'MEDIUM' ? 0.4 : 0.2;

    if (frictionValue < threshold) {
      return null;
    }

    const intensity = Math.min(1.0, frictionValue * (1.2 - traits.cognitiveTolerance));

    if (intensity > 0.8 && traits.explorationPatience < 0.3) {
      return {
        reactionType: 'ABANDONMENT_RISK',
        intensity,
        description: 'Critical friction and low patience levels generated a high risk of user workflow abandonment.',
      };
    }

    if (frictionType === 'HESITATION' || frictionType === 'COMPLEXITY') {
      return {
        reactionType: 'EXPLORATION_SLOWDOWN',
        intensity,
        description: 'Page visual complexity and clutter caused user to slow down navigation pacing.',
      };
    }

    if (intensity > 0.5) {
      return {
        reactionType: 'RETRY_HESITATION',
        intensity,
        description: 'Repeated interface validation errors caused hesitation in retry attempts.',
      };
    }

    return {
      reactionType: 'CONFIDENCE_REDUCTION',
      intensity,
      description: 'Friction layout indicators generated navigation confidence drop.',
    };
  }
}
