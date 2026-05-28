export interface RedesignComparisonReport {
  layoutDriftScore: number;
  similarityRatio: number;
}

export function compareLayoutDifferences(
  beforeSelector: string,
  afterSelector: string
): RedesignComparisonReport {
  return {
    layoutDriftScore: beforeSelector === afterSelector ? 0 : 25,
    similarityRatio: beforeSelector === afterSelector ? 1.0 : 0.82
  };
}
