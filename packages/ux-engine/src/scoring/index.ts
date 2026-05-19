import { UXSignal, UXScore } from '../types';
import { HeuristicResult } from '../heuristics';

export function calculateScores(signals: UXSignal[], heuristics: HeuristicResult[]): UXScore {
  let clarityScore = 100;
  let efficiencyScore = 100;
  let smoothnessScore = 100;

  // Penalize clarity based on Discoverability and Navigation Clarity heuristics
  const clarityIssues = heuristics.filter(h => h.category === 'CTA_DISCOVERABILITY' || h.category === 'NAVIGATION_CLARITY');
  for (const issue of clarityIssues) {
    if (issue.severity === 'HIGH') clarityScore -= 20;
    else if (issue.severity === 'MEDIUM') clarityScore -= 10;
    else if (issue.severity === 'LOW') clarityScore -= 5;
  }

  // Penalize efficiency based on Workflow Complexity and signals like EXCESSIVE_SCROLL and WORKFLOW_EFFICIENCY
  const efficiencyIssues = heuristics.filter(h => h.category === 'WORKFLOW_COMPLEXITY');
  for (const issue of efficiencyIssues) {
    if (issue.severity === 'HIGH') efficiencyScore -= 20;
    else if (issue.severity === 'MEDIUM') efficiencyScore -= 10;
  }
  
  const excessiveScrolls = signals.filter(s => s.signalType === 'EXCESSIVE_SCROLL');
  efficiencyScore -= excessiveScrolls.length * 5;

  // Penalize smoothness based on Repeated Actions, Form Usability, and Dead Ends
  const smoothnessIssues = heuristics.filter(h => h.category === 'FORM_USABILITY' || h.category === 'ONBOARDING_FRICTION');
  for (const issue of smoothnessIssues) {
    if (issue.severity === 'HIGH') smoothnessScore -= 25;
    else if (issue.severity === 'MEDIUM') smoothnessScore -= 15;
  }

  const repeatedActions = signals.filter(s => s.signalType === 'REPEATED_ACTION');
  smoothnessScore -= repeatedActions.length * 5;

  // Ensure scores do not drop below 0
  clarityScore = Math.max(0, clarityScore);
  efficiencyScore = Math.max(0, efficiencyScore);
  smoothnessScore = Math.max(0, smoothnessScore);

  // Overall score is a weighted average
  // e.g. Smoothness is very important, Clarity is very important
  const overallScore = Math.round((clarityScore * 0.4) + (efficiencyScore * 0.3) + (smoothnessScore * 0.3));

  return {
    clarityScore,
    efficiencyScore,
    smoothnessScore,
    overallScore,
  };
}
