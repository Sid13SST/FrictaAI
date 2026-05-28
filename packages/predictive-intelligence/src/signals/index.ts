import { UXFinding } from '@fricta/db';

export interface PredictiveSignalsSummary {
  hesitationCount: number;
  unresponsiveTargetClicks: number;
  complexityWarningCount: number;
}

export function extractPredictiveSignals(
  findings: UXFinding[]
): PredictiveSignalsSummary {
  const hesitationCount = findings.filter(f => f.findingType === 'HESITATION').length;
  const unresponsiveTargetClicks = findings.filter(f => f.findingType === 'CTA_AMBIGUITY' || f.findingType === 'DISCOVERABILITY_FRICTION').length;
  const complexityWarningCount = findings.filter(f => f.findingType === 'COMPLEXITY' || f.findingType === 'IA_CONFUSION').length;

  return {
    hesitationCount,
    unresponsiveTargetClicks,
    complexityWarningCount
  };
}
