import { VisualObservation, VisualScoresResult } from '../types';

export class VisualScoringEngine {
  /**
   * Calculates visual scores (out of 100) based on heuristics findings.
   */
  calculateScores(observations: VisualObservation[]): VisualScoresResult {
    let clarity = 100;
    let discoverability = 100;
    let balance = 100;
    let navigation = 100;

    // Process observations and deduct points based on finding type and severity
    observations.forEach(obs => {
      const deductionMap: Record<string, number> = {
        critical: 25,
        high: 15,
        medium: 10,
        low: 5
      };
      
      const deduction = deductionMap[obs.severity] || 5;

      switch (obs.findingType) {
        case 'weak_cta':
          discoverability -= deduction;
          break;
        case 'poor_hierarchy':
          balance -= deduction * 0.8;
          clarity -= deduction * 0.4;
          break;
        case 'clutter':
          clarity -= deduction;
          balance -= deduction * 0.6;
          break;
        case 'empty_state':
          discoverability -= deduction;
          break;
        case 'form_density':
          clarity -= deduction;
          break;
        case 'nav_overload':
          navigation -= deduction;
          break;
        default:
          clarity -= deduction * 0.5;
          break;
      }
    });

    // Ensure scores are bounded between 0 and 100
    const clamp = (val: number) => Math.max(0, Math.min(100, Math.round(val)));

    const clarityScore = clamp(clarity);
    const discoverabilityScore = clamp(discoverability);
    const layoutBalanceScore = clamp(balance);
    const navigationScore = clamp(navigation);

    // Weighted average of the scores for the overall score
    const overallScore = clamp(
      clarityScore * 0.3 +
      discoverabilityScore * 0.3 +
      layoutBalanceScore * 0.2 +
      navigationScore * 0.2
    );

    return {
      clarityScore,
      discoverabilityScore,
      layoutBalanceScore,
      navigationScore,
      overallScore
    };
  }
}
