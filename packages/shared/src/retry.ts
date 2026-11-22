/**
 * Retry timing for LLM calls (agent planner and vision analyzer).
 *
 * Observed against the real OpenRouter free pool: free models answer 429
 * (upstream rate limit) in bursts, and sometimes 200 with empty content. Three
 * attempts at 1 s / 2 s were not enough. Policy:
 *   - honour the server's wait when it gives one: `Retry-After` (seconds or an
 *     HTTP date) or `X-RateLimit-Reset` (epoch ms, epoch s, or seconds). That
 *     wait is NEVER shortened: retrying inside the provider's cooldown is
 *     non-compliant and just earns another 429;
 *   - otherwise exponential backoff with full jitter, capped at maxDelayMs
 *     (the cap applies only to waits we calculate ourselves);
 *   - a call never waits more than maxTotalWaitMs in total. If the server asks
 *     for longer than the remaining budget, the call is DEFERRED (it stops with
 *     a "rate-limit cooldown" reason) instead of retrying early, and callers
 *     must not evade that cooldown by switching to a fallback model.
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

export type RetryPlan =
  | { action: 'wait'; delayMs: number; source: 'server' | 'backoff' }
  | {
      action: 'defer';
      /** 'cooldown': the server asked for longer than the remaining budget. 'budget': our own backoff would exceed it. */
      cause: 'cooldown' | 'budget';
      /** Server-requested wait, when there was one. */
      requestedMs: number | null;
      reason: string;
    };

/**
 * Decide what to do before retry number `attempt` (1 = after the first
 * failure), given how long this call has already waited.
 */
export function planRetry(
  attempt: number,
  headers: HeaderBag,
  waitedMs: number,
  policy: RetryPolicy = DEFAULT_LLM_RETRY_POLICY,
  random: () => number = Math.random,
  now: number = Date.now(),
): RetryPlan {
  const remaining = Math.max(0, policy.maxTotalWaitMs - waitedMs);
  const requested = serverRequestedDelayMs(headers, now);
  if (requested !== null) {
    if (requested > remaining) {
      return {
        action: 'defer',
        cause: 'cooldown',
        requestedMs: requested,
        reason: `rate-limit cooldown: provider asked to wait ${Math.ceil(requested / 1000)}s, more than the ${Math.floor(remaining / 1000)}s left in this call's retry budget`,
      };
    }
    return { action: 'wait', delayMs: requested, source: 'server' };
  }
  const delay = backoffDelayMs(attempt, policy, random); // capped at maxDelayMs
  if (delay > remaining) {
    return { action: 'defer', cause: 'budget', requestedMs: null, reason: `retry budget of ${Math.floor(policy.maxTotalWaitMs / 1000)}s exhausted` };
  }
  return { action: 'wait', delayMs: delay, source: 'backoff' };
}

/** Statuses worth retrying: rate limit and transient upstream errors. */
export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}
