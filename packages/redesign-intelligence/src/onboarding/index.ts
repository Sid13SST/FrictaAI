export interface OnboardingStreamlineProposal {
  targetStepsCount: number;
  remediationPlan: string;
  expectedRetentionGain: number; // percentage
}

export function generateOnboardingOptimization(
  currentSteps = 8,
  frictionCount = 3
): OnboardingStreamlineProposal {
  const targetStepsCount = Math.max(3, currentSteps - 3);
  const expectedRetentionGain = Math.min(30, 5 + frictionCount * 6.5);

  const remediationPlan = 
    `Reduce onboarding sequence steps from ${currentSteps} to ${targetStepsCount}. ` +
    `Postpone organization configuration fields until after initial dashboard entry, and auto-detect location data.`;

  return {
    targetStepsCount,
    remediationPlan,
    expectedRetentionGain
  };
}
