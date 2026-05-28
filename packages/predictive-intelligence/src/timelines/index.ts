export interface RiskEvent {
  step: number;
  threatType: 'FATIGUE_SPIKE' | 'ONBOARDING_COLLAPSE' | 'CTA_DEGRADATION' | 'NAVIGATION_LOOP';
  description: string;
  probability: number;
}

export function generateProjectedRiskTimeline(
  averageFailureRate: number,
  averageFriction: number,
  expectedExitStep: number
): RiskEvent[] {
  const events: RiskEvent[] = [];

  if (averageFriction > 20) {
    events.push({
      step: 3,
      threatType: 'CTA_DEGRADATION',
      description: 'First sign of CTA discoverability friction projected based on typical user scanning patterns.',
      probability: Math.round(Math.min(0.9, averageFailureRate * 1.2) * 100) / 100
    });
  }

  if (averageFriction > 40) {
    events.push({
      step: 5,
      threatType: 'FATIGUE_SPIKE',
      description: 'Decision overhead begins to compound due to information density.',
      probability: Math.round(Math.min(0.95, averageFailureRate * 1.5) * 100) / 100
    });
  }

  events.push({
    step: expectedExitStep,
    threatType: 'ONBOARDING_COLLAPSE',
    description: `Predicted abandonment threshold step reached. High likelihood of dropout.`,
    probability: Math.round(averageFailureRate * 100) / 100
  });

  return events.sort((a, b) => a.step - b.step);
}
