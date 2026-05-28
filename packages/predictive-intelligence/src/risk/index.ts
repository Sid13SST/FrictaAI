export interface PathRiskIndex {
  workflowPath: string;
  score: number; // 0.0 to 100.0
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export function computePathRiskIndex(
  workflowPath: string,
  failureRate: number,
  avgFrictionScore: number,
  cognitiveFatigueIndex: number
): PathRiskIndex {
  // Weighted sum model
  const rawScore = (failureRate * 40) + (avgFrictionScore * 0.3) + (cognitiveFatigueIndex * 0.3);
  const score = Math.round(Math.min(100, Math.max(0, rawScore)) * 10) / 10;

  const level = 
    score > 75 ? 'CRITICAL' : 
    score > 50 ? 'HIGH' : 
    score > 25 ? 'MEDIUM' : 'LOW';

  return {
    workflowPath,
    score,
    level
  };
}
