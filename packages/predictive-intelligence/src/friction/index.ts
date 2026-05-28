import { WorkflowSession, UXFinding } from '@fricta/db';

export interface FrictionEscalationForecast {
  workflowPath: string;
  accumulatedFrictionScore: number; // 0.0 to 100.0
  escalationRate: number; // derivative of escalation curve
  complexityExplosionRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  projectedFrictionCurve: { step: number; cumulativeFriction: number }[];
}

export function projectFrictionEscalation(
  workflowPath: string,
  sessions: (WorkflowSession & { uxFindings: UXFinding[] })[]
): FrictionEscalationForecast {
  const pathSessions = sessions.filter(s => s.goal?.toLowerCase().includes(workflowPath.toLowerCase()));
  
  let baseFriction = 10;
  let multiplier = 1.2;

  if (pathSessions.length > 0) {
    const totalFindings = pathSessions.reduce((acc, s) => acc + s.uxFindings.length, 0);
    const avgFindings = totalFindings / pathSessions.length;
    baseFriction = Math.max(10, avgFindings * 15);
    multiplier = avgFindings > 3 ? 1.4 : avgFindings > 1.5 ? 1.25 : 1.1;
  }

  const projectedFrictionCurve: { step: number; cumulativeFriction: number }[] = [];
  let cumulative = 0;

  for (let step = 1; step <= 15; step++) {
    const stepFriction = baseFriction * Math.pow(multiplier, step / 4);
    cumulative = Math.min(100, cumulative + stepFriction / 3);
    projectedFrictionCurve.push({ step, cumulativeFriction: Math.round(cumulative * 10) / 10 });
  }

  const finalScore = projectedFrictionCurve[projectedFrictionCurve.length - 1].cumulativeFriction;
  const escalationRate = Math.round((finalScore / 15) * 10) / 10;

  const complexityExplosionRisk = 
    finalScore > 80 ? 'CRITICAL' : 
    finalScore > 60 ? 'HIGH' : 
    finalScore > 35 ? 'MEDIUM' : 'LOW';

  return {
    workflowPath,
    accumulatedFrictionScore: Math.round(finalScore * 10) / 10,
    escalationRate,
    complexityExplosionRisk,
    projectedFrictionCurve
  };
}
