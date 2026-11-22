/**
 * Retry timing for LLM calls (agent planner and vision analyzer).
 *
 * Observed against the real OpenRouter free pool: free models answer 429
 * (upstream rate limit) in bursts, and sometimes 200 with empty content. Three
 * attempts at 1 s / 2 s were not enough. Policy:
 *   - honour the server's wait when it gives one: `Retry-After` (seconds or an
 *     HTTP date) or `X-RateLimit-Reset` (epoch ms, epoch s, or seconds);
 *   - otherwise exponential backoff with full jitter;
 *   - every wait is capped (default 20 s), and so is the total wait budget, so
 *     a call always finishes inside the agent's step timeout.
 */

export interface RetryPolicy {
  /** Attempts per model, including the first. */
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  /** Total time a single call may spend waiting between attempts. */
  maxTotalWaitMs: number;
}

export const DEFAULT_LLM_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 20_000,
  maxTotalWaitMs: 120_000,
};

type HeaderBag = { get(name: string): string | null } | Record<string, string | undefined> | null | undefined;

function header(headers: HeaderBag, name: string): string | null {
  if (!headers) return null;
  if (typeof (headers as any).get === 'function') return (headers as any).get(name);
  const rec = headers as Record<string, string | undefined>;
  const key = Object.keys(rec).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? rec[key] ?? null : null;
}

/**
 * The wait the server asked for, in ms, or null if it gave none we can use.
 * `now` is injectable for tests.
 */
export function serverRequestedDelayMs(headers: HeaderBag, now: number = Date.now()): number | null {
  const retryAfter = header(headers, 'retry-after')?.trim();
  if (retryAfter) {
    if (/^\d+(\.\d+)?$/.test(retryAfter)) return Math.max(0, Math.round(parseFloat(retryAfter) * 1000));
    const at = Date.parse(retryAfter);
    if (!Number.isNaN(at)) return Math.max(0, at - now);
  }

  const reset = header(headers, 'x-ratelimit-reset')?.trim();
  if (reset && /^\d+(\.\d+)?$/.test(reset)) {
    const n = parseFloat(reset);
    if (n > 1e12) return Math.max(0, Math.round(n - now)); // epoch milliseconds (OpenRouter)
    if (n > 1e9) return Math.max(0, Math.round(n * 1000 - now)); // epoch seconds
    return Math.max(0, Math.round(n * 1000)); // seconds from now
  }
  return null;
}

/** Full-jitter exponential backoff: random in [0, min(cap, base * 2^(attempt-1))]. */
export function backoffDelayMs(attempt: number, policy: RetryPolicy = DEFAULT_LLM_RETRY_POLICY, random: () => number = Math.random): number {
  const ceiling = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** Math.max(0, attempt - 1));
  return Math.round(random() * ceiling);
}

/** Delay before retry number `attempt` (1 = the wait after the first failure). Always capped. */
export function retryDelayMs(
  attempt: number,
  headers: HeaderBag,
  policy: RetryPolicy = DEFAULT_LLM_RETRY_POLICY,
  random: () => number = Math.random,
  now: number = Date.now(),
): number {
  const requested = serverRequestedDelayMs(headers, now);
  const delay = requested ?? backoffDelayMs(attempt, policy, random);
  return Math.min(policy.maxDelayMs, delay);
}

/** Statuses worth retrying: rate limit and transient upstream errors. */
export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}
