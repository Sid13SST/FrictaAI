import { WorkflowSession } from '@fricta/db';

export interface BaselineDrift {
  metricName: string;
  baselineValue: number;
  currentValue: number;
  driftValue: number;
  isOutsideThreshold: boolean;
}

export function computeBaselineDrift(
  metricName: string,
  baselineSessions: WorkflowSession[],
  currentSessions: WorkflowSession[],
  threshold = 0.2
): BaselineDrift {
  const avgBaseline = baselineSessions.length > 0 
    ? baselineSessions.reduce((acc, s) => acc + s.stepCount, 0) / baselineSessions.length 
    : 5;
  const avgCurrent = currentSessions.length > 0
    ? currentSessions.reduce((acc, s) => acc + s.stepCount, 0) / currentSessions.length
    : 5;

  const driftValue = avgBaseline > 0 ? (avgCurrent - avgBaseline) / avgBaseline : 0;
  const isOutsideThreshold = Math.abs(driftValue) > threshold;

  return {
    metricName,
    baselineValue: Math.round(avgBaseline * 10) / 10,
    currentValue: Math.round(avgCurrent * 10) / 10,
    driftValue: Math.round(driftValue * 100) / 100,
    isOutsideThreshold
  };
}
