import * as fs from 'fs/promises';
import {
  resolveLLMEndpoint,
  resolveVisionModel,
  assertModelAllowed,
  OPENROUTER_FREE_ROUTER,
  DEFAULT_LLM_RETRY_POLICY,
  RetryPolicy,
  isRetryableStatus,
  retryDelayMs,
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

const DEFAULT_MAX_TOKENS = 500;
const REQUEST_TIMEOUT_MS = 30_000;

type Attempt = { ok: true; content: string; model: string } | { ok: false; reason: 'rate_limited' | 'empty' | 'server_error' | 'network' | 'not_found' | 'client_error'; detail: string };

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
   * Retries: same policy as the planner (Retry-After / X-RateLimit-Reset,
   * else jittered exponential backoff, ≤5 attempts, ≤20 s per wait). Empty
   * content is retryable. After retries on 429 / empty (or 404), one fallback
   * to openrouter/free (OpenRouter only; never a paid id).
   */
  constructor(options: VisionAnalysisOptions = {}, deps: VisionDeps = {}) {
    const endpoint = resolveLLMEndpoint();
    this.apiKey = options.apiKey || endpoint.apiKey;
    this.model = options.model || resolveVisionModel();
    assertModelAllowed(this.model, 'AGENT_VISION_MODEL');
    this.temperature = options.temperature ?? 0.2; // Low temperature for structured analysis
    this.maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
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

      const prompt = `
You are Fricta's Visual UX Expert.
Analyze this web application screenshot and address the following UX concerns:
${contextPrompt}

Provide your response in raw JSON format inside a JSON code block:
\`\`\`json
{
  "explanation": "Detailed visual analysis explanation focusing on user flow, readability, CTA prominence, empty state guidance, and navigation clutter.",
  "clarityFeedback": "Specific feedback on visual clarity and layout quality.",
  "annotatedBoxes": [
    {
      "x": 100,
      "y": 150,
      "w": 80,
      "h": 40,
      "label": "Brief description of the problematic element/area"
    }
  ]
}
\`\`\`
Note: All coordinates in "annotatedBoxes" must represent bounding box percentages or pixels relative to the screenshot's dimensions (assume standard viewport 1280x720 if unsure). If there are no issues or specific elements to point out, return an empty array for "annotatedBoxes".
`;

      const body = (model: string) => JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}`, detail: 'low' } },
            ],
          },
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        response_format: { type: 'json_object' },
      });

      const budget = { waitedMs: 0 };
      let result = await this.tryModel(this.model, body, budget);
      if (!result.ok && this.isOpenRouter && this.model !== OPENROUTER_FREE_ROUTER
          && (result.reason === 'rate_limited' || result.reason === 'empty' || result.reason === 'not_found')) {
        console.warn(`[VisualAIAnalyzer] ${this.model} failed (${result.reason}: ${result.detail}); falling back once to ${OPENROUTER_FREE_ROUTER}.`);
        result = await this.tryModel(OPENROUTER_FREE_ROUTER, body, budget);
      }
      if (!result.ok) throw new Error(`${result.reason}: ${result.detail}`);
      const content = result.content;
      const answeredBy = result.model;

      // Try parsing JSON block
      let parsed: any;
      try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || [null, content];
        const jsonStr = jsonMatch[1].trim();
        parsed = JSON.parse(jsonStr);
      } catch (parseError) {
        console.warn('[VisualAIAnalyzer] Failed to parse JSON from vision model, attempting cleanup.');
        // Clean up markdown markers if any and try parsing directly
        const cleanContent = content.replace(/```json|```/g, '').trim();
        parsed = JSON.parse(cleanContent);
      }

      return {
        status: 'ok',
        model: answeredBy,
        rawResponse: content,
        annotatedBoxes: parsed.annotatedBoxes || [],
        explanation: parsed.explanation || 'No explanation provided.',
        clarityFeedback: parsed.clarityFeedback || 'No clarity feedback provided.'
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
          const content: string = data?.choices?.[0]?.message?.content || '';
          if (content.trim()) return { ok: true, content, model: data?.model ?? model };
          last = { ok: false, reason: 'empty', detail: 'empty response' };
        }
      } catch (err: any) {
        last = { ok: false, reason: 'network', detail: err?.name === 'AbortError' ? `timeout after ${this.requestTimeoutMs}ms` : String(err?.message) };
      }

      if (attempt >= this.policy.maxAttempts) break;
      const delay = retryDelayMs(attempt, headers, this.policy, this.random, this.now());
      if (budget.waitedMs + delay > this.policy.maxTotalWaitMs) break;
      console.warn(`[VisualAIAnalyzer] ${model} attempt ${attempt}/${this.policy.maxAttempts} failed (${(last as any).detail}); retrying in ${delay}ms.`);
      budget.waitedMs += delay;
      await this.sleep(delay);
    }
    return last;
  }
}
