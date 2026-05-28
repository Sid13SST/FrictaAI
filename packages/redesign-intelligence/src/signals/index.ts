export interface OptimizationSignalSummary {
  clutterScore: number; // 0 to 100
  accessibilityScore: number; // 0 to 100
}

export function extractOptimizationSignals(
  findingsCount = 2,
  hesitationsCount = 1
): OptimizationSignalSummary {
  return {
    clutterScore: Math.min(95, 10 + findingsCount * 12.5),
    accessibilityScore: Math.max(45, 95 - hesitationsCount * 10)
  };
}
