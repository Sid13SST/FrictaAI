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

  // Summary generation (Deterministic)
  let summary = `Workflow completed with ${session.actions.length} actions and ${session.interactions.length} interactions. `;
  if (scores.overallScore >= 80) {
    summary += `Overall UX is excellent, indicating a smooth and discoverable flow.`;
  } else if (scores.overallScore >= 60) {
    summary += `Overall UX is acceptable but has areas for improvement, particularly concerning ${recommendations.length > 0 ? recommendations[0].title.toLowerCase() : 'friction'}.`;
  } else {
    summary += `Overall UX indicates significant user struggle. High friction detected.`;
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
