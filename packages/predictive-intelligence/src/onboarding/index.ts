import { WorkflowSession, UXFinding } from '@fricta/db';

export interface OnboardingSurvivabilityForecast {
  onboardingCollapseProbability: number; // 0.0 to 1.0
  retentionImpactIndex: number; // 0.0 to 100.0
  recommendedStepLimit: number;
  survivalRiskStatus: 'STABLE' | 'DEGRADING' | 'CRITICAL';
}

export function forecastOnboardingSurvivability(
  sessions: (WorkflowSession & { uxFindings: UXFinding[] })[]
): OnboardingSurvivabilityForecast {
  const onboardingSessions = sessions.filter(s => 
    s.goal?.toLowerCase().includes('onboard') || 
    s.goal?.toLowerCase().includes('signup') || 
    s.goal?.toLowerCase().includes('register')
  );

  if (onboardingSessions.length === 0) {
    return {
      onboardingCollapseProbability: 0.15,
      retentionImpactIndex: 12.5,
      recommendedStepLimit: 8,
      survivalRiskStatus: 'STABLE'
    };
  }

  const failures = onboardingSessions.filter(s => s.status === 'FAILED');
  const failureRate = failures.length / onboardingSessions.length;

  const totalFindings = onboardingSessions.reduce((acc, s) => acc + s.uxFindings.length, 0);
  const avgFindings = totalFindings / onboardingSessions.length;

  const collapseProbability = Math.min(0.98, failureRate * 0.5 + avgFindings * 0.12 + 0.1);
  const retentionImpactIndex = Math.min(100, collapseProbability * 90 + 5);

  const recommendedStepLimit = Math.max(4, Math.round(12 * (1.0 - collapseProbability)));

  const survivalRiskStatus = 
    collapseProbability > 0.7 ? 'CRITICAL' : 
    collapseProbability > 0.4 ? 'DEGRADING' : 'STABLE';

  return {
    onboardingCollapseProbability: Math.round(collapseProbability * 100) / 100,
    retentionImpactIndex: Math.round(retentionImpactIndex * 10) / 10,
    recommendedStepLimit,
    survivalRiskStatus
  };
}
