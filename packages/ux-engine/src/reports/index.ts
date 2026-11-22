import { SessionData, UXSignal, UXRecommendation, UXScore } from '../types';
import { detectSignals } from '../signals';
import { analyzeHeuristics } from '../heuristics';
import { calculateScores } from '../scoring';
import { generateRecommendations } from '../recommendations';

export interface UXReportData {
  sessionId: string;
  goal?: string | null;
  persona?: string | null;
  durationMs?: number | null;
  signals: UXSignal[];
  recommendations: UXRecommendation[];
  scores: UXScore;
  summary: string;
}

export function buildUXReport(session: SessionData): UXReportData {
  // Layer 1: Detect Signals
  const signals = detectSignals(session);

  // Layer 2: Analyze Heuristics
  const heuristics = analyzeHeuristics(signals, session);

  // Layer 3: Calculate Scores
  const scores = calculateScores(signals, heuristics);

  // Layer 4: Generate Recommendations
  const recommendations = generateRecommendations(heuristics);

  // Calculate duration
  let durationMs = null;
  if (session.startedAt && session.endedAt) {
    durationMs = session.endedAt.getTime() - session.startedAt.getTime();
  } else if (session.actions.length > 0) {
    const first = session.actions[0].timestamp.getTime();
    const last = session.actions[session.actions.length - 1].timestamp.getTime();
    durationMs = last - first;
  }

  // Summary generation (Deterministic). Deliberately states only what was
  // recorded: the overall verdict belongs to the audit grade (scoreAudit,
  // which also weighs the outcome and findings). The old text said "Workflow
  // completed … Overall UX is excellent" from the behavioural score alone, even
  // for failed audits with no actions at all.
  let summary: string;
  if (session.actions.length === 0) {
    summary = `No agent actions were recorded, so this audit produced no behavioural evidence and is not scored.`;
  } else {
    summary = `Agent recorded ${session.actions.length} action${session.actions.length === 1 ? '' : 's'} and ${session.interactions.length} interaction${session.interactions.length === 1 ? '' : 's'}.`;
    if (recommendations.length > 0) summary += ` Main behavioural friction: ${recommendations[0].title.toLowerCase()}.`;
    else summary += ` No behavioural friction signals were detected in the action log.`;
  }

  return {
    sessionId: session.id,
    goal: session.goal,
    persona: session.persona,
    durationMs,
    signals,
    recommendations,
    scores,
    summary,
  };
}
