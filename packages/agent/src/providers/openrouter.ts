/**
 * OpenRouter AI Provider
 *
 * Communicates with OpenRouter's OpenAI-compatible API.
 * Architecture is prepared for: rate limiting, retry handling,
 * provider fallback, and future multi-model routing.
 */

import { AIMessage, AIProviderConfig, AIProviderResponse } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0.3; // Low temp = deterministic, structured outputs

// Retry configuration (lightweight for Phase 2, expandable later)
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const RETRY_BACKOFF_MULTIPLIER = 2;

// ─── Rate Limit State (in-memory, per-process) ────────────────────────────────
// Prepared for future enhancement: sliding window rate limiter

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

// ─── Utilities ────────────────────────────────────────────────────────────────

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(status: number): boolean {
  // 429 = rate limited, 500/502/503 = server errors
  return status === 429 || status === 500 || status === 502 || status === 503;
}

function updateRateLimitState(): void {
  const now = Date.now();
  // Reset window every 60 seconds
  if (now - rateLimitState.windowStart > 60_000) {
    rateLimitState.requestCount = 0;
    rateLimitState.windowStart = now;
  }
  rateLimitState.requestCount++;
  rateLimitState.lastRequestAt = now;
}

// ─── OpenRouter Provider ──────────────────────────────────────────────────────

export class OpenRouterProvider {
  private readonly config: Required<AIProviderConfig>;

  constructor(config: AIProviderConfig) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model || DEFAULT_MODEL,
      maxTokens: config.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: config.temperature ?? DEFAULT_TEMPERATURE,
      baseUrl: config.baseUrl || OPENROUTER_BASE_URL,
    };
  }

  /**
   * Send a chat completion request to OpenRouter.
   * Implements retry with exponential backoff for transient errors.
   */
  async chat(messages: AIMessage[]): Promise<AIProviderResponse> {
    let attempt = 0;
    let delayMs = RETRY_DELAY_MS;

    while (attempt < MAX_RETRIES) {
      attempt++;

      try {
        updateRateLimitState();

        const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://fricta.ai',
            'X-Title': 'Fricta AI UX Agent',
          },
          body: JSON.stringify({
            model: this.config.model,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            max_tokens: this.config.maxTokens,
            temperature: this.config.temperature,
            // Force JSON-like structured output where supported
            response_format: { type: 'text' },
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');

          if (isRetryableError(response.status) && attempt < MAX_RETRIES) {
            console.warn(
              `[OpenRouter] Request failed (status=${response.status}), ` +
              `attempt ${attempt}/${MAX_RETRIES}. Retrying in ${delayMs}ms...`
            );
            await sleep(delayMs);
            delayMs *= RETRY_BACKOFF_MULTIPLIER;
            continue;
          }

          throw new Error(
            `OpenRouter API error: HTTP ${response.status} — ${errorBody}`
          );
        }

        const data = await response.json() as any;

        const content: string = data.choices?.[0]?.message?.content ?? '';
        if (!content) {
          throw new Error('OpenRouter returned empty content');
        }

        return {
          content,
          model: data.model ?? this.config.model,
          usage: data.usage
            ? {
                promptTokens: data.usage.prompt_tokens ?? 0,
                completionTokens: data.usage.completion_tokens ?? 0,
                totalTokens: data.usage.total_tokens ?? 0,
              }
            : undefined,
        };
      } catch (err: any) {
        // Non-retryable errors (network, JSON parse, etc.) — rethrow immediately
        if (attempt >= MAX_RETRIES) {
          throw new Error(`[OpenRouter] All ${MAX_RETRIES} attempts failed: ${err.message}`);
        }

        // Only retry if it looks like a transient/network error
        const isNetworkError = err.message?.includes('fetch') || err.name === 'TypeError';
        if (!isNetworkError) {
          throw err;
        }

        console.warn(
          `[OpenRouter] Network error on attempt ${attempt}/${MAX_RETRIES}. ` +
          `Retrying in ${delayMs}ms...`
        );
        await sleep(delayMs);
        delayMs *= RETRY_BACKOFF_MULTIPLIER;
      }
    }

    throw new Error('[OpenRouter] Exhausted all retry attempts');
  }

  getModel(): string {
    return this.config.model;
  }

  /**
   * getRateLimitInfo — for observability / future dashboard display.
   * Returns requests made in current window.
   */
  getRateLimitInfo(): { requestCount: number; windowStart: Date; lastRequestAt: Date | null } {
    return {
      requestCount: rateLimitState.requestCount,
      windowStart: new Date(rateLimitState.windowStart),
      lastRequestAt: rateLimitState.lastRequestAt
        ? new Date(rateLimitState.lastRequestAt)
        : null,
    };
  }
}
