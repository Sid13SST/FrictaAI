import type { OpportunityCandidate } from '../types';

export class Prioritizer {
  /**
   * Deterministically calculate prioritization score.
   * RICE Score: (Reach * Impact * Confidence) / Effort
   * Reach: 0.0 - 1.0 (percent of users affected)
   * Impact: 0.0 - 1.0 (relative survivability/completion gain)
   * Confidence: 0.0 - 1.0 (engine confidence level)
   * Effort: 1 (LOW), 2 (MEDIUM), 3 (HIGH)
   * Multiply by 100 for readability.
   */
  static calculate(op: OpportunityCandidate, memories: any[]): number {
    const reach = op.userReach;
    const impact = op.impactPotential;
    const confidence = op.confidence;

    let effort = 2; // MEDIUM default
    if (op.implementationComplexity === 'LOW') effort = 1;
    if (op.implementationComplexity === 'HIGH') effort = 3;

    // RICE Calculation
    let score = ((reach * impact * confidence) / effort) * 100;

    // Historical Success Patterns Boost:
    // If we have memories of SUCCESSFUL_PATTERN for this metric, boost score.
    const relevantMemories = memories.filter(m =>
      m.memoryType === 'SUCCESSFUL_PATTERN' &&
      m.metricImpacted.toLowerCase().includes(op.opportunityType.toLowerCase())
    );

    if (relevantMemories.length > 0) {
      // 10% boost per successful historical pattern, max 30%
      const boost = Math.min(relevantMemories.length * 0.1, 0.3);
      score = score * (1 + boost);
    }

    return parseFloat(score.toFixed(2));
  }
}
