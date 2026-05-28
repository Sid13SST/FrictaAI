export interface CognitiveSimplification {
  targetStep: number;
  remediationPlan: string;
  expectedLoadReduction: number; // percentage
}

export function generateCognitiveOptimization(
  step = 4,
  overloadCount = 2
): CognitiveSimplification {
  const remediationPlan = overloadCount > 2
    ? `Reduce layout clutter at Step ${step}. Group elements into collapsable accordion segments and defer secondary visual components.`
    : `Increase text legibility, reduce choices from 8 options to 4, and present actions sequentially.`;

  return {
    targetStep: step,
    remediationPlan,
    expectedLoadReduction: Math.min(60, 20 + overloadCount * 12.5)
  };
}
