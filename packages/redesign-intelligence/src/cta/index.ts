export interface CTAOptimizationPlan {
  elementSelector: string;
  proposedFix: string;
  expectedClarityGain: number; // percentage
}

export function generateCTAOptimization(
  elementSelector = 'button.cta-primary',
  findingsCount = 2
): CTAOptimizationPlan {
  const proposedFix = findingsCount > 3
    ? 'Re-arrange button layout hierarchy. Defer secondary elements, center primary action, and increase visual weight by using a high-contrast background color.'
    : 'Adjust typography weight to bold (600), add hover visual feedback transition, and increase contrast ratio to exceed 4.5:1.';

  return {
    elementSelector,
    proposedFix,
    expectedClarityGain: Math.min(45, 10 + findingsCount * 8.5)
  };
}
