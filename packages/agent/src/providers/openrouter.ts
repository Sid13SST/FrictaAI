/**
 * OpenRouter AI Provider
 *
 * Talks to OpenRouter's OpenAI-compatible API (or any endpoint given by
 * AGENT_BASE_URL).
 *
 * Resilience (tuned after a real run against the OpenRouter free pool, where
 * google/gemma-4-31b-it:free answered 429 to every attempt of a 3 × 1 s/2 s
 * retry loop and the audit failed at step 2):
 *   - up to 5 attempts per model on 429 / 408 / 5xx / network errors / timeouts
 *     / empty content;
 *   - waits honour Retry-After / X-RateLimit-Reset, otherwise exponential
 *     backoff with full jitter, each capped at 20 s, total budget 120 s;
 *   - after a model's retries are exhausted on 429 or empty content (or it is
 *     gone: 404, or out of credit: 402 on a paid model), fall back ONCE to
 *     openrouter/free, OpenRouter's free-only router. Never to a paid id.
 *     Only on OpenRouter itself; other endpoints have no such router.
 */

import { AIMessage, AIProviderConfig, AIProviderResponse } from '../types';
import {
  OPENROUTER_BASE_URL,
  DEFAULT_FREE_AGENT_MODEL,
  OPENROUTER_FREE_ROUTER,
  DEFAULT_LLM_RETRY_POLICY,
  RetryPolicy,
  isFreeModelId,
  assertModelAllowed,
  isRetryableStatus,
  retryDelayMs,
} from '@fricta/shared';

const DEFAULT_MODEL = DEFAULT_FREE_AGENT_MODEL;
const DEFAULT_MAX_TOKENS = 150;
const DEFAULT_TEMPERATURE = 0.3; // Low temp = deterministic, structured outputs
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_TOKEN_DOWNSCALES = 5;

/** Injectable for tests (fake fetch, instant sleep, fixed jitter). */
export interface ProviderDeps {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  now?: () => number;
  retryPolicy?: RetryPolicy;
  requestTimeoutMs?: number;
}

// ─── Rate Limit State (in-memory, per-process; observability only) ───────────

interface RateLimitState {
  requestCount: number;
  windowStart: number;
  lastRequestAt: number;
}

const rateLimitState: RateLimitState = {
  requestCount: 0,
  windowStart: Date.now(),
  lastRequestAt: 0,
};

function updateRateLimitState(): void {
  const now = Date.now();
  if (now - rateLimitState.windowStart > 60_000) {
    rateLimitState.requestCount = 0;
    rateLimitState.windowStart = now;
  }
  rateLimitState.requestCount++;
  rateLimitState.lastRequestAt = now;
}

/** Why the last attempt on a model failed. */
type FailureReason = 'rate_limited' | 'empty' | 'server_error' | 'network' | 'not_found' | 'payment_required';

type ModelOutcome =
  | { ok: true; response: AIProviderResponse }
  | { ok: false; reason: FailureReason; detail: string; attempts: number };

/** Reasons after which falling back to openrouter/free is worthwhile. */
const FALLBACK_REASONS: FailureReason[] = ['rate_limited', 'empty', 'not_found', 'payment_required'];

// ─── OpenRouter Provider ──────────────────────────────────────────────────────

export class OpenRouterProvider {
  private readonly config: Required<AIProviderConfig>;
  private readonly isOpenRouter: boolean;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly random: () => number;
  private readonly now: () => number;
  private readonly policy: RetryPolicy;
  private readonly requestTimeoutMs: number;

  constructor(config: AIProviderConfig, deps: ProviderDeps = {}) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model || DEFAULT_MODEL,
      maxTokens: config.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: config.temperature ?? DEFAULT_TEMPERATURE,
      baseUrl: (config.baseUrl || OPENROUTER_BASE_URL).replace(/\/+$/, ''),
    };
    // Guard direct construction too, not just the factory.
    assertModelAllowed(this.config.model, 'AGENT_MODEL');
    this.isOpenRouter = /^https?:\/\/(www\.)?openrouter\.ai(\/|$)/i.test(this.config.baseUrl);
    this.fetchImpl = deps.fetch ?? ((...args) => fetch(...args));
    this.sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.random = deps.random ?? Math.random;
    this.now = deps.now ?? Date.now;
    this.policy = deps.retryPolicy ?? DEFAULT_LLM_RETRY_POLICY;
    this.requestTimeoutMs = deps.requestTimeoutMs ?? REQUEST_TIMEOUT_MS;
  }

  async chat(messages: AIMessage[]): Promise<AIProviderResponse> {
    const budget = { waitedMs: 0 };
    const primary = await this.tryModel(this.config.model, messages, budget);
    if (primary.ok) return primary.response;

    const canFallBack =
      this.isOpenRouter &&
      this.config.model !== OPENROUTER_FREE_ROUTER &&
      FALLBACK_REASONS.includes(primary.reason);

    if (canFallBack) {
      console.warn(
        `[OpenRouter] ${this.config.model} failed after ${primary.attempts} attempt(s) (${primary.reason}: ${primary.detail}). ` +
        `Falling back once to ${OPENROUTER_FREE_ROUTER}.`
      );
      const fallback = await this.tryModel(OPENROUTER_FREE_ROUTER, messages, budget);
      if (fallback.ok) {
        // Keep using the free router for the rest of this run instead of
        // re-hitting a model that is rate-limited or gone.
        console.info(`[OpenRouter] Continuing this run on ${OPENROUTER_FREE_ROUTER}.`);
        this.config.model = OPENROUTER_FREE_ROUTER;
        return fallback.response;
      }
      throw new Error(
        `[OpenRouter] ${this.config.model} (${primary.reason}) and fallback ${OPENROUTER_FREE_ROUTER} ` +
        `(${fallback.reason}: ${fallback.detail}) both failed`
      );
    }

    throw new Error(`[OpenRouter] ${this.config.model} failed after ${primary.attempts} attempt(s): ${primary.reason}: ${primary.detail}`);
  }

  /** Up to policy.maxAttempts attempts on one model. Throws only on non-retryable errors. */
  private async tryModel(model: string, messages: AIMessage[], budget: { waitedMs: number }): Promise<ModelOutcome> {
    let maxTokens = model === this.config.model ? this.config.maxTokens : DEFAULT_MAX_TOKENS;
    let downscales = 0;
    let last: { reason: FailureReason; detail: string } = { reason: 'network', detail: 'no attempt made' };

    for (let attempt = 1; attempt <= this.policy.maxAttempts; attempt++) {
      let headers: Headers | null = null;
      try {
        updateRateLimitState();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);
        let response: Response;
        try {
          response = await this.fetchImpl(`${this.config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://fricta.ai',
              'X-Title': 'Fricta AI UX Agent',
              // Self-hosted OpenAI-compatible endpoints may not need a key.
              ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
            },
            body: JSON.stringify({
              model,
              messages: messages.map((m) => ({ role: m.role, content: m.content })),
              max_tokens: maxTokens,
              temperature: this.config.temperature,
              response_format: { type: 'text' },
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
        }
        headers = response.headers;

        if (!response.ok) {
          const body = await response.text().catch(() => '');

          if (response.status === 402) {
            if (!isFreeModelId(model)) {
              // Paid model (only reachable with ALLOW_PAID_MODELS=true) out of credit.
              return { ok: false, reason: 'payment_required', detail: body.slice(0, 200), attempts: attempt };
            }
            const next = downscaledMaxTokens(body, maxTokens);
            if (next && downscales < MAX_TOKEN_DOWNSCALES) {
              console.warn(`[OpenRouter] HTTP 402 on ${model}; downscaling maxTokens ${maxTokens} → ${next}.`);
              maxTokens = next;
              downscales++;
              attempt--; // not a real failure; retry immediately
              continue;
            }
            throw new Error(`OpenRouter API error: HTTP 402 — ${body.slice(0, 300)}`);
          }

          if (response.status === 404) {
            // e.g. a rotated free variant: "No endpoints found for <model>".
            return { ok: false, reason: 'not_found', detail: body.slice(0, 200), attempts: attempt };
          }

          if (!isRetryableStatus(response.status)) {
            throw new Error(`OpenRouter API error: HTTP ${response.status} — ${body.slice(0, 300)}`);
          }
          last = { reason: response.status === 429 ? 'rate_limited' : 'server_error', detail: `HTTP ${response.status}` };
        } else {
          const data = (await response.json()) as any;
          const content: string = data?.choices?.[0]?.message?.content ?? '';
          if (content.trim()) {
            if (model === this.config.model && maxTokens < this.config.maxTokens) {
              this.config.maxTokens = maxTokens; // keep the affordable cap for later calls
            }
            return {
              ok: true,
              response: {
                content,
                model: data.model ?? model,
                usage: data.usage
                  ? {
                      promptTokens: data.usage.prompt_tokens ?? 0,
                      completionTokens: data.usage.completion_tokens ?? 0,
                      totalTokens: data.usage.total_tokens ?? 0,
                    }
                  : undefined,
              },
            };
          }
          last = { reason: 'empty', detail: 'empty content' };
        }
      } catch (err: any) {
        const transient = err?.name === 'AbortError' || err?.name === 'TypeError' || /fetch failed|network|ECONN|ETIMEDOUT/i.test(err?.message ?? '');
        if (!transient) throw err;
        last = { reason: 'network', detail: err?.name === 'AbortError' ? `timeout after ${this.requestTimeoutMs}ms` : err.message };
      }

      if (attempt >= this.policy.maxAttempts) break;
      const delay = retryDelayMs(attempt, headers, this.policy, this.random, this.now());
      if (budget.waitedMs + delay > this.policy.maxTotalWaitMs) {
        console.warn(`[OpenRouter] Retry wait budget (${this.policy.maxTotalWaitMs}ms) exhausted on ${model}.`);
        return { ok: false, ...last, attempts: attempt };
      }
      console.warn(`[OpenRouter] ${model} attempt ${attempt}/${this.policy.maxAttempts} failed (${last.detail}); retrying in ${delay}ms.`);
      budget.waitedMs += delay;
      await this.sleep(delay);
    }

    return { ok: false, ...last, attempts: this.policy.maxAttempts };
  }

  getModel(): string {
    return this.config.model;
  }

  /** For observability: requests made in the current 60 s window. */
  getRateLimitInfo(): { requestCount: number; windowStart: Date; lastRequestAt: Date | null } {
    return {
      requestCount: rateLimitState.requestCount,
      windowStart: new Date(rateLimitState.windowStart),
      lastRequestAt: rateLimitState.lastRequestAt ? new Date(rateLimitState.lastRequestAt) : null,
    };
  }
}

/** Parse OpenRouter's 402 bodies for an affordable max_tokens; else halve. */
function downscaledMaxTokens(body: string, current: number): number | null {
  let next = 0;
  let m = body.match(/requested up to (\d+) tokens, but can only afford (\d+)/i);
  if (m) {
    const affordable = parseInt(m[2], 10);
    if (affordable > 0 && affordable < current) next = affordable;
  }
  if (!next) {
    m = body.match(/Prompt tokens limit exceeded: (\d+) > (\d+)/i);
    if (m) {
      const diff = parseInt(m[1], 10) - parseInt(m[2], 10);
      if (diff > 0) next = current - diff;
    }
  }
  if (!next || next >= current) next = Math.floor(current * 0.5);
  return next >= 5 && next < current ? next : null;
}
