export type PersonaType = 'BEGINNER' | 'POWER_USER' | 'FIRST_TIME_USER' | 'DISTRACTED_USER';

export interface PersonaTraits {
  navigationConfidence: number;  // 0.0 to 1.0
  explorationPatience: number;   // 0.0 to 1.0 (how many failures before backtrack)
  errorTolerance: number;        // 0.0 to 1.0 (retry threshold)
  readingDepth: number;          // 0.0 to 1.0 (scan vs deep reading)
  ctaTrustLevel: number;         // 0.0 to 1.0 (propensity to click)
  formConfidence: number;        // 0.0 to 1.0 (hesitation in forms)
  cognitiveTolerance: number;    // 0.0 to 1.0 (frustration threshold)
  attentionStability: number;    // 0.0 to 1.0 (focus vs cursor drift)
}

export interface SimulationConfig {
  profileId?: string;
  projectId: string;
  personaType: PersonaType;
  startUrl: string;
  goal: string;
}

export interface PacingConfig {
  baseClickDelayMs: number;
  baseHoverDelayMs: number;
  baseScanDelayMs: number;
  baseReadDelayMs: number;
  baseBacktrackDelayMs: number;
}
