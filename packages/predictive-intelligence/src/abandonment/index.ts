import { WorkflowSession } from '@fricta/db';

export interface AbandonmentForecast {
  abandonmentRiskProbability: number; // 0.0 to 1.0
  predictedExitStep: number;
  triggerFactors: string[];
}

export function forecastAbandonmentRisk(
  sessions: WorkflowSession[]
): AbandonmentForecast {
  const totalSessions = sessions.length || 1;
  const failedSessions = sessions.filter(s => s.status === 'FAILED');
  const failureRate = failedSessions.length / totalSessions;

  const abandonmentRiskProbability = Math.min(0.95, failureRate * 0.8 + 0.1);

  // Compute average step count at failure
  let avgExitStep = 6;
  if (failedSessions.length > 0) {
    const sum = failedSessions.reduce((acc, s) => acc + s.stepCount, 0);
    avgExitStep = Math.max(2, Math.round(sum / failedSessions.length));
  }

  const triggerFactors: string[] = [];
  if (failureRate > 0.4) {
    triggerFactors.push('Frequent errors during data submissions');
  }
  if (abandonmentRiskProbability > 0.6) {
    triggerFactors.push('Prolonged delay/inactivity triggers observed in previous steps');
  }

  return {
    abandonmentRiskProbability: Math.round(abandonmentRiskProbability * 100) / 100,
    predictedExitStep: avgExitStep,
    triggerFactors: triggerFactors.length > 0 ? triggerFactors : ['Friction accumulation']
  };
}
