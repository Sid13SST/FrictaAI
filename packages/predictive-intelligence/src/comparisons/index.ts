import { WorkflowSession, UXFinding } from '@fricta/db';

export interface ComparisonReport {
  historicalSimilarity: number; // 0.0 to 1.0
  matchingFailurePatterns: string[];
  driftPercentage: number;
}

export function compareToHistoricalFailures(
  currentFindings: UXFinding[],
  historicalSessions: (WorkflowSession & { uxFindings: UXFinding[] })[]
): ComparisonReport {
  const currentTypes = new Set(currentFindings.map(f => f.findingType));
  let maxSimilarity = 0.0;
  let matchingFailurePatterns: string[] = [];

  const failedSessions = historicalSessions.filter(s => s.status === 'FAILED');

  for (const session of failedSessions) {
    const historicalTypes = new Set(session.uxFindings.map(f => f.findingType));
    const intersection = new Set([...currentTypes].filter(x => historicalTypes.has(x)));
    const union = new Set([...currentTypes, ...historicalTypes]);

    if (union.size > 0) {
      const jaccard = intersection.size / union.size;
      if (jaccard > maxSimilarity) {
        maxSimilarity = jaccard;
        matchingFailurePatterns = Array.from(intersection);
      }
    }
  }

  const driftPercentage = Math.round((currentFindings.length / (failedSessions.length || 1)) * 100);

  return {
    historicalSimilarity: Math.round(maxSimilarity * 100) / 100,
    matchingFailurePatterns,
    driftPercentage
  };
}
