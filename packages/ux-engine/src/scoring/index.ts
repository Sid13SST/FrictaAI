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

// ─── Audit score (single source of truth for the report grade) ───────────────

export type AuditOutcome = 'COMPLETED' | 'FAILED' | 'TIMEOUT' | 'LOOP_DETECTED' | string | null | undefined;

export interface AuditScoreInput {
  /** Behavioural pillars from calculateScores() (action-log signals only). */
  behavioural: Pick<UXScore, 'clarityScore' | 'efficiencyScore' | 'smoothnessScore'> | null | undefined;
  /** Final WorkflowSession status. */
  outcome: AuditOutcome;
  uxFindings: Array<{ severity: string }>;
  visualFindings: Array<{ severity: string; findingType: string }>;
  /**
   * Number of actions the agent actually executed and recorded. 0 means the
   * run produced no behavioural evidence (e.g. every LLM call was
   * rate-limited), so there is nothing to grade.
   */
  actionCount: number;
}

export type AuditEvidence = 'sufficient' | 'insufficient';

export interface AuditScore {
  /** All scores are null when evidence is 'insufficient'. */
  clarityScore: number | null;
  efficiencyScore: number | null;
  smoothnessScore: number | null;
  overallScore: number | null;
  evidence: AuditEvidence;
  goalReached: boolean;
  breakdown: {
    behaviouralOverall: number | null;
    uxFindingsPenalty: number;
    visualFindingsPenalty: number;
    outcomeCap: number | null;
  };
}

const UX_FINDING_PENALTY: Record<string, number> = { CRITICAL: 15, HIGH: 10, MEDIUM: 5, LOW: 2 };
const VISUAL_FINDING_PENALTY: Record<string, number> = { CRITICAL: 8, HIGH: 5, MEDIUM: 3, LOW: 1 };
const MAX_UX_FINDINGS_PENALTY = 40;
const MAX_VISUAL_FINDINGS_PENALTY = 25;
/** An audit whose goal was not reached cannot score above this (grade F band). */
export const GOAL_NOT_REACHED_CAP = 55;
/** Visual finding types that are commentary, not defects. */
const NON_DEFECT_VISUAL_TYPES = new Set(['vision_summary', 'vision_unavailable']);

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const weighted = (c: number, e: number, s: number) => Math.round(c * 0.4 + e * 0.3 + s * 0.3);

/**
 * scoreAudit — the one formula behind the report's overall score and grade
 * (and therefore the exports and PDF). It starts from the behavioural pillars,
 * then:
 *   - UX findings lower smoothness (capped at -40),
 *   - visual defect findings lower clarity (capped at -25),
 *   - an audit that did not reach its goal is capped at GOAL_NOT_REACHED_CAP.
 * Missing behavioural data starts each pillar at 100; it is never a constant
 * 100 regardless of findings.
 *
 * A run with no recorded actions has no evidence: every score is null and
 * evidence is 'insufficient'. (It used to get 55/F with "behavioural 100",
 * i.e. a grade for an audit that never happened.)
 */
export function scoreAudit(input: AuditScoreInput): AuditScore {
  if (!input.actionCount || input.actionCount <= 0) {
    return {
      clarityScore: null,
      efficiencyScore: null,
      smoothnessScore: null,
      overallScore: null,
      evidence: 'insufficient',
      goalReached: false,
      breakdown: { behaviouralOverall: null, uxFindingsPenalty: 0, visualFindingsPenalty: 0, outcomeCap: null },
    };
  }

  const b = input.behavioural ?? { clarityScore: 100, efficiencyScore: 100, smoothnessScore: 100 };
  const behaviouralOverall = weighted(b.clarityScore, b.efficiencyScore, b.smoothnessScore);

  const uxFindingsPenalty = Math.min(
    MAX_UX_FINDINGS_PENALTY,
    input.uxFindings.reduce((sum, f) => sum + (UX_FINDING_PENALTY[String(f.severity).toUpperCase()] ?? 0), 0),
  );
  const visualFindingsPenalty = Math.min(
    MAX_VISUAL_FINDINGS_PENALTY,
    input.visualFindings
      .filter((f) => !NON_DEFECT_VISUAL_TYPES.has(f.findingType))
      .reduce((sum, f) => sum + (VISUAL_FINDING_PENALTY[String(f.severity).toUpperCase()] ?? 0), 0),
  );

  const clarityScore = clamp(b.clarityScore - visualFindingsPenalty);
  const efficiencyScore = clamp(b.efficiencyScore);
  const smoothnessScore = clamp(b.smoothnessScore - uxFindingsPenalty);

  const goalReached = input.outcome === 'COMPLETED';
  // Unknown / still-running outcome: do not cap (the report may be read mid-run).
  const terminalFailure = ['FAILED', 'TIMEOUT', 'LOOP_DETECTED'].includes(String(input.outcome));
  const outcomeCap = terminalFailure ? GOAL_NOT_REACHED_CAP : null;

  let overallScore = weighted(clarityScore, efficiencyScore, smoothnessScore);
  if (outcomeCap !== null) overallScore = Math.min(overallScore, outcomeCap);

  return {
    clarityScore,
    efficiencyScore,
    smoothnessScore,
    overallScore,
    evidence: 'sufficient',
    goalReached,
    breakdown: { behaviouralOverall, uxFindingsPenalty, visualFindingsPenalty, outcomeCap },
  };
}
