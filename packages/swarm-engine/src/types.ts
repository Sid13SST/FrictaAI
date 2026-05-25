export type SwarmPersonaType =
  | 'BEGINNER_TEACHER'
  | 'DISTRACTED_STUDENT'
  | 'IMPATIENT_ADMIN'
  | 'LOW_CONFIDENCE'
  | 'ACCESSIBILITY_CONSTRAINED'
  | 'MOBILE_FIRST'
  | 'POWER_USER'
  | 'FIRST_TIME_VISITOR';

export interface SwarmPersonaTraits {
  navigationConfidence: number;   // 0.0 to 1.0
  explorationPatience: number;    // 0.0 to 1.0
  attentionStability: number;     // 0.0 to 1.0
  decisionPatience: number;       // 0.0 to 1.0
  ctaTrustLevel: number;          // 0.0 to 1.0
  cognitiveTolerance: number;     // 0.0 to 1.0
  abandonmentThreshold: number;   // 0.0 to 1.0 (lower means abandons faster)
  errorTolerance: number;         // 0.0 to 1.0
  readingDepth: number;           // 0.0 to 1.0
  formConfidence: number;         // 0.0 to 1.0
}

export interface SwarmConfig {
  projectId: string;
  startUrl: string;
  goal: string;
  personas: SwarmPersonaType[];
}
