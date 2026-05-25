import { PersonaTraits, PersonaType } from '../types';

export class PersonaManager {
  private static defaultTraits: Record<PersonaType, PersonaTraits> = {
    BEGINNER: {
      navigationConfidence: 0.3,
      explorationPatience: 0.4,
      errorTolerance: 0.2,
      readingDepth: 0.8,
      ctaTrustLevel: 0.4,
      formConfidence: 0.3,
      cognitiveTolerance: 0.3,
      attentionStability: 0.9,
    },
    POWER_USER: {
      navigationConfidence: 0.9,
      explorationPatience: 0.8,
      errorTolerance: 0.8,
      readingDepth: 0.1,
      ctaTrustLevel: 0.8,
      formConfidence: 0.9,
      cognitiveTolerance: 0.9,
      attentionStability: 0.8,
    },
    FIRST_TIME_USER: {
      navigationConfidence: 0.5,
      explorationPatience: 0.6,
      errorTolerance: 0.5,
      readingDepth: 0.6,
      ctaTrustLevel: 0.6,
      formConfidence: 0.5,
      cognitiveTolerance: 0.6,
      attentionStability: 0.7,
    },
    DISTRACTED_USER: {
      navigationConfidence: 0.6,
      explorationPatience: 0.3,
      errorTolerance: 0.4,
      readingDepth: 0.2,
      ctaTrustLevel: 0.5,
      formConfidence: 0.6,
      cognitiveTolerance: 0.4,
      attentionStability: 0.2,
    },
  };

  /**
   * Retrieves default traits for a specific persona type.
   */
  public static getTraits(type: PersonaType): PersonaTraits {
    return this.defaultTraits[type] || this.defaultTraits.FIRST_TIME_USER;
  }
}
