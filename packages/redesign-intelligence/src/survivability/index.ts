export interface SurvivabilityEnhancement {
  workflowPath: string;
  expectedSurvivalGain: number; // percentage
  remediationPlan: string;
}

export function generateSurvivabilityOptimization(
  workflowPath: string,
  dropouts = 2
): SurvivabilityEnhancement {
  const expectedSurvivalGain = Math.min(35, 10 + dropouts * 7.5);
  const remediationPlan = 
    `Stabilize ${workflowPath} dropoffs by implementing inline form validation, ` +
    `providing helper tooltips for complex configurations, and offering a quick recovery backtrack action.`;

  return {
    workflowPath,
    expectedSurvivalGain,
    remediationPlan
  };
}
