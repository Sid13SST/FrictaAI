import { WorkflowSession, UXFinding } from '@fricta/db';

export interface NavigationBreakdownForecast {
  navigationLoopProbability: number;
  conventionMismatchThreat: boolean;
  mismatchScore: number; // 0.0 to 100.0
  recommendations: string[];
}

export function forecastNavigationBreakdown(
  sessions: (WorkflowSession & { uxFindings: UXFinding[] })[]
): NavigationBreakdownForecast {
  const navLoopFindings = sessions.flatMap(s => 
    s.uxFindings.filter(f => f.findingType === 'NAVIGATION_LOOP' || f.findingType === 'IA_CONFUSION')
  );

  const totalSessions = sessions.length || 1;
  const loopRate = navLoopFindings.length / totalSessions;

  const navigationLoopProbability = Math.min(0.95, loopRate * 0.35 + 0.05);

  const mismatchFindingsCount = sessions.flatMap(s => 
    s.uxFindings.filter(f => f.findingType === 'CTA_AMBIGUITY' || f.description.toLowerCase().includes('convention'))
  ).length;

  const mismatchScore = Math.min(100, (mismatchFindingsCount / totalSessions) * 25);
  const conventionMismatchThreat = mismatchScore > 40;

  const recommendations: string[] = [];
  if (navigationLoopProbability > 0.4) {
    recommendations.push('Simplify primary and secondary navigation trees. Implement breadcrumbs.');
  }
  if (conventionMismatchThreat) {
    recommendations.push('Realign ambiguous iconography with standard platform layouts.');
  }

  return {
    navigationLoopProbability: Math.round(navigationLoopProbability * 100) / 100,
    conventionMismatchThreat,
    mismatchScore: Math.round(mismatchScore * 10) / 10,
    recommendations
  };
}
