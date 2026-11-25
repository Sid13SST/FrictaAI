import { connection } from './connection';

/**
 * "Report analysis pending" marker, shared by every backend process via Redis.
 *
 * Set when a worker starts an audit job; cleared by the backend when its
 * post-run finalization (visual analysis, UX analysis, report, score) ends.
 * While it exists the report is provisional: readers must not present scores
 * as final. The TTL bounds a stale marker if a process dies mid-run.
 */
export const ANALYSIS_PENDING_TTL_S = 1800;
export const analysisPendingKey = (sessionId: string) => `fricta:analysis-pending:${sessionId}`;

const withTimeout = <T>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);

export async function markAnalysisPending(sessionId: string): Promise<void> {
  await withTimeout(connection.set(analysisPendingKey(sessionId), '1', 'EX', ANALYSIS_PENDING_TTL_S).then(() => undefined), 2000, undefined);
}

export async function clearAnalysisPending(sessionId: string): Promise<void> {
  await withTimeout(connection.del(analysisPendingKey(sessionId)).then(() => undefined), 2000, undefined);
}

/** Which of the given sessions are still being analysed. Redis errors → treated as not pending. */
export async function pendingAnalysisSet(sessionIds: string[]): Promise<Set<string>> {
  if (sessionIds.length === 0) return new Set();
  try {
    const flags = await withTimeout(
      Promise.all(sessionIds.map((id) => connection.exists(analysisPendingKey(id)))),
      1500,
      [] as number[],
    );
    return new Set(sessionIds.filter((_, i) => flags[i] === 1));
  } catch {
    return new Set();
  }
}
