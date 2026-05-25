export interface PersonaTraits {
  navigationConfidence: number;
  explorationPatience: number;
  errorTolerance: number;
  readingDepth: number;
  ctaTrustLevel: number;
  formConfidence: number;
  cognitiveTolerance: number;
  attentionStability: number;
}

export interface VisualElement {
  selector: string;
  type: 'BUTTON' | 'INPUT' | 'LINK' | 'TEXT_BLOCK';
  text: string;
  ctaProminence: number;
  contrastStrength: number;
  interactionDensity: number;
}

export interface CognitiveLoadResult {
  cognitiveLoad: number;
  mentalEffort: number;
  informationLoad: number;
  interactionLoad: number;
  description: string;
}

export interface ConfidenceSignalResult {
  confidenceScore: number;
  certaintyLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  evidenceSource: string;
  description: string;
}

export interface AttentionEventResult {
  visibilityWeight: number;
  focusHeat: number;
  overloadDetected: boolean;
  description: string;
}

export interface ExpectationMismatchResult {
  expectedAction: string;
  actualAction: string;
  mismatchSeverity: 'LOW' | 'MEDIUM' | 'HIGH';
  mismatchCategory: 'NAV_MISPLACEMENT' | 'CTA_AMBIGUITY' | 'UI_CONVENTION_BREAK' | 'PROGRESS_DESYNC';
  description: string;
}

export interface DecisionComplexityResult {
  choiceCount: number;
  ambiguityScore: number;
  complexityLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  nextActionClarity: number;
  description: string;
}

export interface AbandonmentRiskResult {
  riskProbability: number;
  triggerSource: string;
  frictionAccumulated: number;
  description: string;
}

export interface TrustUncertaintyResult {
  suspicionScore: number;
  anxietyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
}
