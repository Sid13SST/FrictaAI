export class PredictivePatternMatcher {
  public static match(
    historicalPatterns: Array<{ patternType: string; severity: string; frequency: number }>
  ) {
    const findings: string[] = [];

    for (const pat of historicalPatterns) {
      if (pat.frequency > 2 && (pat.severity === 'HIGH' || pat.severity === 'CRITICAL')) {
        findings.push(`Pattern Warning: Persistent ${pat.patternType} has been detected in ${pat.frequency} sessions, representing a high systemic risk.`);
      }
    }

    if (findings.length === 0) {
      findings.push('Stability Signal: No severe recurring friction patterns detected in recent test cycles.');
    }

    return findings;
  }
}
