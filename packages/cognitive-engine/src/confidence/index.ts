import { PersonaTraits, ConfidenceSignalResult } from '../types';

export class ConfidenceSignalEstimator {
  public static calculate(
    traits: PersonaTraits,
    currentConfidence: number,
    options: {
      hasHesitated: boolean;
      hesitationType?: string;
      failuresCount: number;
      actionType: 'CLICK' | 'INPUT' | 'HOVER' | 'SCAN';
      targetSelector?: string;
    }
  ): ConfidenceSignalResult {
    let score = currentConfidence;
    let evidenceSource = 'CLICK_CERTAINTY';
    let description = 'User behaves with high certainty committing to click targets.';

    // Adjust based on failures (backtracking)
    if (options.failuresCount > 0) {
      score = Math.max(0.1, score - (options.failuresCount * 0.18));
      evidenceSource = 'BACKTRACKING';
      description = `Confidence degraded due to ${options.failuresCount} consecutive interaction error(s) or backtracking.`;
    }

    // Adjust based on active hesitation signals
    if (options.hasHesitated) {
      score = Math.max(0.15, score - 0.12);
      if (options.hesitationType === 'FORM_FIELD_UNCERTAINTY') {
        evidenceSource = 'FORM_FIELD_UNCERTAINTY';
        description = 'User hesitated while filling input field, verifying expected formats.';
      } else if (options.hesitationType === 'CURSOR_DRIFT') {
        evidenceSource = 'CURSOR_DRIFT';
        description = 'Cursor drifted aimlessly over target. User skimming layout under distraction.';
      } else if (options.hesitationType === 'REPEATED_SCANNING') {
        evidenceSource = 'REPEATED_SCANNING';
        description = 'Repeated visual scanning loops detected, indicating structural search friction.';
      } else {
        evidenceSource = 'HOVER_HESITATION';
        description = 'User hovered over target link with hesitation prior to clicking.';
      }
    }

    // Ensure score matches traits bounds
    const certaintyLevel = score > 0.7 ? 'HIGH' : score > 0.4 ? 'MEDIUM' : 'LOW';

    return {
      confidenceScore: score,
      certaintyLevel,
      evidenceSource,
      description,
    };
  }
}
