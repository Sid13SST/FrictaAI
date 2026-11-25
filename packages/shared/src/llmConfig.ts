/**
 * LLM endpoint + model policy shared by the agent planner and the vision analyzer.
 *
 * Fricta runs at zero model spend by default:
 *   - The default models are OpenRouter ":free" variants.
 *   - Any configured model id that is not free is rejected at provider
 *     construction time unless ALLOW_PAID_MODELS=true is set explicitly.
 *
 * Endpoint:
 *   - AGENT_BASE_URL (optional) points the provider at any OpenAI-compatible
 *     endpoint (`<base>/chat/completions`). Defaults to OpenRouter.
 *   - AGENT_API_KEY (optional) is used for that endpoint; otherwise
 *     OPENROUTER_API_KEY. A key is mandatory only for OpenRouter itself.
 *
 * Models:
 *   - AGENT_MODEL         text planner model (default below)
 *   - AGENT_VISION_MODEL  screenshot analysis model, must accept image input
 *
 * The free-model check is a naming rule (OpenRouter suffixes zero-cost
 * variants with ":free"; "openrouter/free" is its free-only router). It applies
 * to every endpoint, because a model id alone cannot prove that a third-party
 * endpoint is free. For a self-hosted endpoint whose ids do not end in ":free",
 * set ALLOW_PAID_MODELS=true deliberately.
 */

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * Gemma 4 31B (free) on OpenRouter: text + image input, 262k context, $0.
 * One model for both paths keeps the free setup to a single id. Confirmed
 * free and image-capable from OpenRouter's public models API
 * (GET https://openrouter.ai/api/v1/models) on 2026-11-22. Free variants are
 * rotated by OpenRouter; re-check with
 * `npm run check:models --workspace=@fricta/backend` (no key, no cost),
 * especially if requests start returning 404 "No endpoints found".
 */
export const DEFAULT_FREE_AGENT_MODEL = 'google/gemma-4-31b-it:free';
export const DEFAULT_FREE_VISION_MODEL = 'google/gemma-4-31b-it:free';

/** OpenRouter's free-only router, used as a last-resort fallback on HTTP 402. */
export const OPENROUTER_FREE_ROUTER = 'openrouter/free';

export class PaidModelNotAllowedError extends Error {
  constructor(public readonly model: string, public readonly envVar: string) {
    super(
      `[LLMConfig] ${envVar}="${model}" is not a free model. Fricta refuses paid models by default ` +
        `(Rs 0 spend policy). Use a model id ending in ":free" (default: ${DEFAULT_FREE_AGENT_MODEL}), ` +
        `or set ALLOW_PAID_MODELS=true to opt in to paid usage explicitly.`
    );
    this.name = 'PaidModelNotAllowedError';
  }
}

type Env = Record<string, string | undefined>;

export function isFreeModelId(model: string): boolean {
  const id = model.trim();
  return id.endsWith(':free') || id === OPENROUTER_FREE_ROUTER;
}

export function paidModelsAllowed(env: Env = process.env): boolean {
  return (env.ALLOW_PAID_MODELS ?? '').trim().toLowerCase() === 'true';
}

/** Throws PaidModelNotAllowedError unless the model is free or paid use is opted in. */
export function assertModelAllowed(model: string, envVar: string, env: Env = process.env): void {
  if (isFreeModelId(model)) return;
  if (paidModelsAllowed(env)) {
    console.warn(`[LLMConfig] ALLOW_PAID_MODELS=true — using non-free model ${envVar}="${model}". This may incur cost.`);
    return;
  }
  throw new PaidModelNotAllowedError(model, envVar);
}

export interface LLMEndpointConfig {
  baseUrl: string;
  /** Empty string when no key is configured (allowed for non-OpenRouter endpoints). */
  apiKey: string;
  isOpenRouter: boolean;
}

function clean(v: string | undefined): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}

export function resolveLLMEndpoint(env: Env = process.env): LLMEndpointConfig {
  const baseUrl = (clean(env.AGENT_BASE_URL) ?? OPENROUTER_BASE_URL).replace(/\/+$/, '');
  const isOpenRouter = /^https?:\/\/(www\.)?openrouter\.ai(\/|$)/i.test(baseUrl);
  const apiKey = clean(env.AGENT_API_KEY) ?? clean(env.OPENROUTER_API_KEY) ?? '';
  return { baseUrl, apiKey, isOpenRouter };
}

/** True when the configured endpoint needs a key and none is set. */
export function llmKeyMissing(env: Env = process.env): boolean {
  const ep = resolveLLMEndpoint(env);
  return ep.isOpenRouter && !ep.apiKey;
}

export function resolveAgentModel(env: Env = process.env): string {
  const model = clean(env.AGENT_MODEL) ?? DEFAULT_FREE_AGENT_MODEL;
  assertModelAllowed(model, 'AGENT_MODEL', env);
  return model;
}

export function resolveVisionModel(env: Env = process.env): string {
  const model = clean(env.AGENT_VISION_MODEL) ?? DEFAULT_FREE_VISION_MODEL;
  assertModelAllowed(model, 'AGENT_VISION_MODEL', env);
  return model;
}
