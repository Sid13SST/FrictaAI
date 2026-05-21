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
const DEFAULT_MAX_TOKENS = 150;
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
    let currentMaxTokens = this.config.maxTokens;
    let currentModel = this.config.model;

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
            model: currentModel,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            max_tokens: currentMaxTokens,
            temperature: this.config.temperature,
            // Force JSON-like structured output where supported
            response_format: { type: 'text' },
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');

          if (response.status === 402) {
            // Check if we are already using a free model fallback
            if (currentModel !== 'openrouter/free' && !currentModel.endsWith(':free')) {
              const fallbackModel = 'openrouter/free';
              console.warn(
                `[OpenRouter] HTTP 402 Credit limit hit. ` +
                `Switching model from ${currentModel} to free fallback model: ${fallbackModel}`
              );
              currentModel = fallbackModel;
              // Reset token limits for the free model
              currentMaxTokens = DEFAULT_MAX_TOKENS;
              attempt--; // Retry immediately
              continue;
            }

            let nextMaxTokens = 0;

            // Case 1: "You requested up to X tokens, but can only afford Y."
            let match = errorBody.match(/requested up to (\d+) tokens, but can only afford (\d+)/i);
            if (match && match[2]) {
              const affordableTokens = parseInt(match[2], 10);
              if (affordableTokens > 0 && affordableTokens < currentMaxTokens) {
                nextMaxTokens = affordableTokens;
              }
            }

            // Case 2: "Prompt tokens limit exceeded: A > B"
            if (!nextMaxTokens) {
              match = errorBody.match(/Prompt tokens limit exceeded: (\d+) > (\d+)/i);
              if (match && match[1] && match[2]) {
                const requested = parseInt(match[1], 10);
                const affordable = parseInt(match[2], 10);
                const difference = requested - affordable;
                if (difference > 0) {
                  nextMaxTokens = currentMaxTokens - difference;
                }
              }
            }

            // Case 3: Generic fallback - reduce by 50%
            if (!nextMaxTokens || nextMaxTokens >= currentMaxTokens) {
              nextMaxTokens = Math.floor(currentMaxTokens * 0.5);
            }

            if (nextMaxTokens >= 5 && nextMaxTokens < currentMaxTokens) {
              console.warn(
                `[OpenRouter] HTTP 402 Credit limit hit on free model. ` +
                `Downscaling maxTokens from ${currentMaxTokens} to ${nextMaxTokens}.`
              );
              currentMaxTokens = nextMaxTokens;
              attempt--; // Retry immediately
              continue;
            }
          }

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
          // Empty content is a transient model failure — retry with backoff
          if (attempt < MAX_RETRIES) {
            console.warn(
              `[OpenRouter] Empty content received (attempt ${attempt}/${MAX_RETRIES}). ` +
              `Retrying in ${delayMs}ms...`
            );
            await sleep(delayMs);
            delayMs *= RETRY_BACKOFF_MULTIPLIER;
            continue;
          }
          throw new Error('OpenRouter returned empty content after all retries');
        }

        // Cache the downscaled token limit to prevent 402 on subsequent requests in the loop
        if (currentMaxTokens < this.config.maxTokens) {
          console.info(`[OpenRouter] Propagating downscaled maxTokens (${currentMaxTokens}) to config.`);
          this.config.maxTokens = currentMaxTokens;
        }

        if (currentModel !== this.config.model) {
          console.info(`[OpenRouter] Propagating fallback model (${currentModel}) to config.`);
          this.config.model = currentModel;
        }

        return {
          content,
          model: data.model ?? currentModel,
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
