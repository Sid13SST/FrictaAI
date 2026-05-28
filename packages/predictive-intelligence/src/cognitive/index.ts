import { WorkflowSession, UXFinding } from '@fricta/db';

export interface CognitiveLoadForecast {
  averageFatigueIndex: number; // 0.0 to 100.0
  attentionFragmentationRate: number; // 0.0 to 100.0
  decisionComplexityEscalation: 'STABLE' | 'MODERATE' | 'SEVERE';
  mitigations: string[];
  fatigueOverSteps: { step: number; load: number }[];
}

export function forecastCognitiveLoad(
  sessions: (WorkflowSession & { uxFindings: UXFinding[] })[]
): CognitiveLoadForecast {
  const totalFindings = sessions.reduce((acc, s) => acc + s.uxFindings.length, 0);
  const totalSessions = sessions.length || 1;
  const avgFindings = totalFindings / totalSessions;

  const averageFatigueIndex = Math.min(100, 15 + avgFindings * 12);
  const attentionFragmentationRate = Math.min(100, 10 + avgFindings * 15);

  const decisionComplexityEscalation = 
    averageFatigueIndex > 70 ? 'SEVERE' : 
    averageFatigueIndex > 40 ? 'MODERATE' : 'STABLE';

  const mitigations: string[] = [];
  if (averageFatigueIndex > 50) {
    mitigations.push('Reduce choice count per screen (apply Hicks Law).');
    mitigations.push('Chunk data entry sections into distinct accordion-guided steps.');
  }

  // Generate step fatigue curve
  const fatigueOverSteps: { step: number; load: number }[] = [];
  let currentLoad = 20;

  for (let step = 1; step <= 10; step++) {
    // Cognitive burden increases per step, especially if the app has a high findings density
    const stepIncrease = 3.5 * (1.0 + (avgFindings * 0.4));
    currentLoad = Math.min(100, currentLoad + stepIncrease);
    fatigueOverSteps.push({ step, load: Math.round(currentLoad * 10) / 10 });
  }

  return {
    averageFatigueIndex: Math.round(averageFatigueIndex * 10) / 10,
    attentionFragmentationRate: Math.round(attentionFragmentationRate * 10) / 10,
    decisionComplexityEscalation,
    mitigations,
    fatigueOverSteps
  };
}
