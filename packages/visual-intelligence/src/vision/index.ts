import * as fs from 'fs/promises';
import { repairTruncatedJson } from './jsonRepair';
import {
  resolveLLMEndpoint,
  resolveVisionModel,
  assertModelAllowed,
  OPENROUTER_FREE_ROUTER,
  DEFAULT_LLM_RETRY_POLICY,
  RetryPolicy,
  isRetryableStatus,
  planRetry,
} from '@fricta/shared';

export interface VisionAnalysisOptions {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string;
}

/** Injectable for tests (fake fetch, instant sleep, fixed jitter). */
export interface VisionDeps {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  now?: () => number;
  retryPolicy?: RetryPolicy;
  requestTimeoutMs?: number;
}

export interface VisionAnalysisResult {
  /**
   * ok      — the model answered and the answer parsed;
   * failed  — every attempt (and the free fallback) failed: 429s, empty
   *           responses, timeouts, unparseable output…;
   * skipped — not attempted (no key for OpenRouter).
   * Anything but 'ok' means visual coverage for this screenshot is incomplete.
   */
  status: 'ok' | 'failed' | 'skipped';
  /** Why it failed / was skipped (no secrets). */
  reason?: string;
  /** Model that produced the answer (may be the openrouter/free fallback). */
  model?: string;
  /**
   * The answer was cut off (finish_reason "length") or had to be repaired;
   * only the complete findings before the cut are kept. Coverage for this
   * screenshot is therefore partial.
   */
  truncated?: boolean;
  rawResponse: string;
  annotatedBoxes: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
  }>;
  explanation: string;
  clarityFeedback: string;
}

/**
 * 500 was too low: real free-model answers were cut off mid-JSON around
 * 1,260 characters ("Unterminated string in JSON"). The prompt now also caps
 * the answer size, so 1,200 leaves headroom. Override: AGENT_VISION_MAX_TOKENS.
 */
const DEFAULT_MAX_TOKENS = 1200;
/** Output limits asked of the model, and enforced again when parsing. */
export const VISION_LIMITS = { maxBoxes: 5, explanationChars: 400, feedbackChars: 200, labelChars: 60 };
const SHORT_RETRY_LIMITS = { maxBoxes: 3, explanationChars: 200, feedbackChars: 120, labelChars: 40 };
const REQUEST_TIMEOUT_MS = 30_000;

type Attempt = { ok: true; content: string; model: string; finishReason: string | null } | { ok: false; reason: 'rate_limited' | 'cooldown' | 'empty' | 'server_error' | 'network' | 'not_found' | 'client_error'; detail: string };

export class VisualAIAnalyzer {
  private apiKey: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private baseUrl: string;
  private isOpenRouter: boolean;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly random: () => number;
  private readonly now: () => number;
  private readonly policy: RetryPolicy;
  private readonly requestTimeoutMs: number;

  /**
   * Endpoint and model come from AGENT_BASE_URL / AGENT_API_KEY (or
   * OPENROUTER_API_KEY) / AGENT_VISION_MODEL, the same policy as the agent
   * planner. The model must accept image input; the default is a free one.
   * A non-free model throws PaidModelNotAllowedError unless ALLOW_PAID_MODELS=true.
   *
   * Retries: same policy as the planner (Retry-After / X-RateLimit-Reset
   * honoured exactly, else jittered exponential backoff ≤20 s, ≤5 attempts,
   * 120 s budget). Empty content is retryable. After retries on 429 / empty
   * (or 404), one fallback to openrouter/free (OpenRouter only; never a paid
   * id). A provider cooldown longer than the budget stops the call with no
   * fallback.
   */
  constructor(options: VisionAnalysisOptions = {}, deps: VisionDeps = {}) {
    const endpoint = resolveLLMEndpoint();
    this.apiKey = options.apiKey || endpoint.apiKey;
    this.model = options.model || resolveVisionModel();
    assertModelAllowed(this.model, 'AGENT_VISION_MODEL');
    this.temperature = options.temperature ?? 0.2; // Low temperature for structured analysis
    const envMax = parseInt(process.env.AGENT_VISION_MAX_TOKENS ?? '', 10);
    this.maxTokens = options.maxTokens ?? (Number.isFinite(envMax) && envMax > 0 ? envMax : DEFAULT_MAX_TOKENS);
    this.baseUrl = (options.baseUrl || endpoint.baseUrl).replace(/\/+$/, '');
    this.isOpenRouter = /^https?:\/\/(www\.)?openrouter\.ai(\/|$)/i.test(this.baseUrl);
    this.fetchImpl = deps.fetch ?? ((...args) => fetch(...args));
    this.sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.random = deps.random ?? Math.random;
    this.now = deps.now ?? Date.now;
    this.policy = deps.retryPolicy ?? DEFAULT_LLM_RETRY_POLICY;
    this.requestTimeoutMs = deps.requestTimeoutMs ?? REQUEST_TIMEOUT_MS;
  }

  /**
   * Analyzes a screenshot using a multimodal vision model.
   * Only triggered selectively when deterministic heuristics signal ambiguity, high complexity,
   * or when specific context needs interpretation.
   */
  async analyzeScreenshot(
    imagePath: string,
    contextPrompt: string
  ): Promise<VisionAnalysisResult> {
    if (!this.apiKey && this.isOpenRouter) {
      console.warn('[VisualAIAnalyzer] OPENROUTER_API_KEY is not set. Visual AI analysis skipped.');
      return {
        status: 'skipped',
        reason: 'no OpenRouter API key configured',
        rawResponse: '',
        annotatedBoxes: [],
        explanation: 'AI Vision analysis was skipped because OPENROUTER_API_KEY is not set.',
        clarityFeedback: 'Heuristics-only fallback mode.'
      };
    }

    try {
      const buffer = await fs.readFile(imagePath);
      const base64Image = buffer.toString('base64');
      const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/webp';

      const promptFor = (l: typeof VISION_LIMITS) => `
You are Fricta's Visual UX Expert.
Analyze this web application screenshot and address the following UX concerns:
${contextPrompt}

Return ONLY one JSON object, no prose, no code fence, in this shape:
{"explanation":"...","clarityFeedback":"...","annotatedBoxes":[{"x":100,"y":150,"w":80,"h":40,"label":"..."}]}

Hard limits (the answer is cut off if it is longer):
- "explanation": at most ${l.explanationChars} characters, about user flow, readability, CTA prominence and navigation clutter.
- "clarityFeedback": at most ${l.feedbackChars} characters.
- "annotatedBoxes": at most ${l.maxBoxes} items, most important first; each "label" at most ${l.labelChars} characters.
Coordinates are pixels in the screenshot (assume 1280x720 if unsure). Use [] if nothing needs pointing out.
`;

      const bodyFor = (limits: typeof VISION_LIMITS) => (model: string) => JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: promptFor(limits) },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}`, detail: 'low' } },
            ],
          },
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        response_format: { type: 'json_object' },
      });

      const budget = { waitedMs: 0 };
      const ask = async (limits: typeof VISION_LIMITS) => {
        const body = bodyFor(limits);
        let result = await this.tryModel(this.model, body, budget);
        if (!result.ok && this.isOpenRouter && this.model !== OPENROUTER_FREE_ROUTER
            && (result.reason === 'rate_limited' || result.reason === 'empty' || result.reason === 'not_found')) {
          console.warn(`[VisualAIAnalyzer] ${this.model} failed (${result.reason}: ${result.detail}); falling back once to ${OPENROUTER_FREE_ROUTER}.`);
          result = await this.tryModel(OPENROUTER_FREE_ROUTER, body, budget);
        }
        return result;
      };

      // First answer; if it is cut off or unparseable, ask once more for a
      // shorter answer. Keep the best result: a complete answer beats a
      // repaired partial one; a repaired partial beats nothing.
      const first = await ask(VISION_LIMITS);
      if (!first.ok) throw new Error(`${first.reason}: ${first.detail}`);
      let parsed = parseVisionAnswer(first.content, first.finishReason, VISION_LIMITS);
      let answeredBy = first.model;
      let rawResponse = first.content;

      if (!parsed || parsed.truncated) {
        console.warn(`[VisualAIAnalyzer] Vision answer ${parsed ? 'was truncated and repaired' : 'was unparseable'} (finish_reason=${first.finishReason ?? 'n/a'}, ${first.content.length} chars); retrying once with a shorter-output request.`);
        const second = await ask(SHORT_RETRY_LIMITS);
        if (second.ok) {
          const reparsed = parseVisionAnswer(second.content, second.finishReason, SHORT_RETRY_LIMITS);
          if (reparsed && (!reparsed.truncated || !parsed)) {
            parsed = reparsed;
            answeredBy = second.model;
            rawResponse = second.content;
          }
        }
      }
      if (!parsed) {
        throw new Error(`unparseable model output (finish_reason=${first.finishReason ?? 'n/a'}); retry also failed`);
      }

      return {
        status: 'ok',
        model: answeredBy,
        truncated: parsed.truncated || undefined,
        rawResponse,
        annotatedBoxes: parsed.annotatedBoxes,
        explanation: parsed.explanation,
        clarityFeedback: parsed.clarityFeedback,
      };

    } catch (error: any) {
      console.error('[VisualAIAnalyzer] Vision analysis failed:', error.message);
      return {
        status: 'failed',
        reason: String(error.message).slice(0, 200),
        rawResponse: '',
        annotatedBoxes: [],
        explanation: `Vision analysis failed: ${error.message}`,
        clarityFeedback: 'Fell back to layout heuristics due to vision call failure.'
      };
    }
  }

  private async tryModel(model: string, body: (model: string) => string, budget: { waitedMs: number }): Promise<Attempt> {
    let last: Attempt = { ok: false, reason: 'network', detail: 'no attempt made' };
    for (let attempt = 1; attempt <= this.policy.maxAttempts; attempt++) {
      let headers: Headers | null = null;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);
        let response: Response;
        try {
          response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://fricta.ai',
              'X-Title': 'Fricta AI UX Visual Intelligence',
            },
            body: body(model),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
        }
        headers = response.headers;
        if (!response.ok) {
          const text = (await response.text().catch(() => '')).slice(0, 200);
          if (response.status === 404) return { ok: false, reason: 'not_found', detail: `HTTP 404 ${text}` };
          if (!isRetryableStatus(response.status)) return { ok: false, reason: 'client_error', detail: `HTTP ${response.status} ${text}` };
          last = { ok: false, reason: response.status === 429 ? 'rate_limited' : 'server_error', detail: `HTTP ${response.status}` };
        } else {
          const data = (await response.json()) as any;
          const choice = data?.choices?.[0];
          const content: string = choice?.message?.content || '';
          // OpenRouter normalises to "length"; some providers report native values.
          const finishReason: string | null = choice?.finish_reason ?? choice?.native_finish_reason ?? null;
          if (content.trim()) return { ok: true, content, model: data?.model ?? model, finishReason };
          last = { ok: false, reason: 'empty', detail: 'empty response' };
        }
      } catch (err: any) {
        last = { ok: false, reason: 'network', detail: err?.name === 'AbortError' ? `timeout after ${this.requestTimeoutMs}ms` : String(err?.message) };
      }

      if (attempt >= this.policy.maxAttempts) break;
      const plan = planRetry(attempt, headers, budget.waitedMs, this.policy, this.random, this.now());
      if (plan.action === 'defer') {
        console.warn(`[VisualAIAnalyzer] ${model}: ${plan.reason}; not retrying this call.`);
        // Cooldown: stop and do not fall back (that would evade the provider's cooldown).
        if (plan.cause === 'cooldown') return { ok: false, reason: 'cooldown', detail: plan.reason };
        break;
      }
      console.warn(`[VisualAIAnalyzer] ${model} attempt ${attempt}/${this.policy.maxAttempts} failed (${(last as any).detail}); retrying in ${plan.delayMs}ms (${plan.source}).`);
      budget.waitedMs += plan.delayMs;
      await this.sleep(plan.delayMs);
    }
    return last;
  }
}

// ─── Answer parsing ──────────────────────────────────────────────────────────

const LENGTH_FINISH = /^(length|max_tokens|MAX_TOKENS)$/;

type ParsedAnswer = {
  explanation: string;
  clarityFeedback: string;
  annotatedBoxes: VisionAnalysisResult['annotatedBoxes'];
  truncated: boolean;
};

const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

/**
 * Parse a vision answer, repairing truncated JSON when needed. Only complete,
 * well-formed boxes are kept (numeric x/y/w/h and a label), capped to the
 * requested count; text fields are clipped to the requested lengths.
 * Returns null when nothing usable could be recovered.
 */
export function parseVisionAnswer(content: string, finishReason: string | null, limits = VISION_LIMITS): ParsedAnswer | null {
  const repaired = repairTruncatedJson(content);
  if (!repaired || typeof repaired.value !== 'object' || repaired.value === null || Array.isArray(repaired.value)) return null;
  const v = repaired.value as Record<string, unknown>;

  const boxes = (Array.isArray(v.annotatedBoxes) ? v.annotatedBoxes : [])
    .filter((b: any) => b && ['x', 'y', 'w', 'h'].every((k) => typeof b[k] === 'number' && Number.isFinite(b[k])) && typeof b.label === 'string' && b.label.trim())
    .slice(0, limits.maxBoxes)
    .map((b: any) => ({ x: b.x, y: b.y, w: b.w, h: b.h, label: clip(b.label, limits.labelChars) }));

  const explanation = clip(v.explanation, limits.explanationChars);
  const clarityFeedback = clip(v.clarityFeedback, limits.feedbackChars);
  if (!explanation && !clarityFeedback && boxes.length === 0) return null;

  return {
    explanation: explanation || 'No explanation provided.',
    clarityFeedback: clarityFeedback || 'No clarity feedback provided.',
    annotatedBoxes: boxes,
    truncated: repaired.repaired || LENGTH_FINISH.test(finishReason ?? ''),
  };
}
