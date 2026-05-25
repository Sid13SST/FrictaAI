import { SwarmPersonaTraits, SwarmPersonaType } from '../types';

export class SwarmPersonaManager {
  private static presets: Record<SwarmPersonaType, SwarmPersonaTraits> = {
    BEGINNER_TEACHER: {
      navigationConfidence: 0.4,
      explorationPatience: 0.8,
      attentionStability: 0.8,
      decisionPatience: 0.7,
      ctaTrustLevel: 0.5,
      cognitiveTolerance: 0.6,
      abandonmentThreshold: 0.7,
      errorTolerance: 0.6,
      readingDepth: 0.8,
      formConfidence: 0.4,
    },
    DISTRACTED_STUDENT: {
      navigationConfidence: 0.6,
      explorationPatience: 0.3,
      attentionStability: 0.2,
      decisionPatience: 0.3,
      ctaTrustLevel: 0.6,
      cognitiveTolerance: 0.4,
      abandonmentThreshold: 0.4,
      errorTolerance: 0.4,
      readingDepth: 0.2,
      formConfidence: 0.6,
    },
    IMPATIENT_ADMIN: {
      navigationConfidence: 0.8,
      explorationPatience: 0.2,
      attentionStability: 0.7,
      decisionPatience: 0.2,
      ctaTrustLevel: 0.8,
      cognitiveTolerance: 0.3,
      abandonmentThreshold: 0.2,
      errorTolerance: 0.3,
      readingDepth: 0.2,
      formConfidence: 0.8,
    },
    LOW_CONFIDENCE: {
      navigationConfidence: 0.2,
      explorationPatience: 0.5,
      attentionStability: 0.9,
      decisionPatience: 0.6,
      ctaTrustLevel: 0.3,
      cognitiveTolerance: 0.3,
      abandonmentThreshold: 0.6,
      errorTolerance: 0.2,
      readingDepth: 0.9,
      formConfidence: 0.2,
    },
    ACCESSIBILITY_CONSTRAINED: {
      navigationConfidence: 0.3,
      explorationPatience: 0.7,
      attentionStability: 0.4,
      decisionPatience: 0.6,
      ctaTrustLevel: 0.4,
      cognitiveTolerance: 0.4,
      abandonmentThreshold: 0.5,
      errorTolerance: 0.4,
      readingDepth: 0.8,
      formConfidence: 0.3,
    },
    MOBILE_FIRST: {
      navigationConfidence: 0.7,
      explorationPatience: 0.5,
      attentionStability: 0.5,
      decisionPatience: 0.5,
      ctaTrustLevel: 0.7,
      cognitiveTolerance: 0.6,
      abandonmentThreshold: 0.5,
      errorTolerance: 0.5,
      readingDepth: 0.3,
      formConfidence: 0.7,
    },
    POWER_USER: {
      navigationConfidence: 0.95,
      explorationPatience: 0.8,
      attentionStability: 0.85,
      decisionPatience: 0.9,
      ctaTrustLevel: 0.9,
      cognitiveTolerance: 0.9,
      abandonmentThreshold: 0.9,
      errorTolerance: 0.8,
      readingDepth: 0.1,
      formConfidence: 0.95,
    },
    FIRST_TIME_VISITOR: {
      navigationConfidence: 0.5,
      explorationPatience: 0.6,
      attentionStability: 0.7,
      decisionPatience: 0.6,
      ctaTrustLevel: 0.6,
      cognitiveTolerance: 0.6,
      abandonmentThreshold: 0.6,
      errorTolerance: 0.5,
      readingDepth: 0.6,
      formConfidence: 0.5,
    },
  };

  public static getTraits(type: SwarmPersonaType): SwarmPersonaTraits {
    return this.presets[type] || this.presets.FIRST_TIME_VISITOR;
  }

  public static getDisplayName(type: SwarmPersonaType): string {
    return type
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  public static getAllPresets(): Record<SwarmPersonaType, SwarmPersonaTraits> {
    return this.presets;
  }
}
