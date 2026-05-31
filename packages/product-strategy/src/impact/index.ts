export class ImpactEstimator {
  /**
   * Estimates potential survivability improvement percentage based on linked UX evidence complexity and severity.
   */
  static estimateSurvivabilityGain(evidenceList: { evidenceType: string; description: string }[]): number {
    let baseGain = 0.02; // baseline 2% improvement
    for (const ev of evidenceList) {
      if (ev.evidenceType === 'ANOMALY') {
        if (ev.description.toLowerCase().includes('critical')) baseGain += 0.08;
        else baseGain += 0.04;
      } else if (ev.evidenceType === 'INVESTIGATION') {
        baseGain += 0.06;
      } else if (ev.evidenceType === 'SIGNAL') {
        baseGain += 0.02;
      }
    }
    return Math.min(parseFloat(baseGain.toFixed(3)), 0.30); // max 30% survivability improvement
  }

  /**
   * Estimates the percent of user reach based on the number and cohort profiles of trace items.
   */
  static estimateUserReach(evidenceList: any[]): number {
    // Basic approximation: more traces across different sessions = higher reach
    let reachVal = 0.10; // base 10%
    reachVal += Math.min(evidenceList.length * 0.08, 0.70); // max +70%
    return parseFloat(reachVal.toFixed(2));
  }
}
