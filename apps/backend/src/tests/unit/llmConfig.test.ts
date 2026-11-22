import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import type { AddressInfo } from 'net';
import * as path from 'path';
import {
  DEFAULT_FREE_AGENT_MODEL,
  DEFAULT_FREE_VISION_MODEL,
  OPENROUTER_BASE_URL,
  PaidModelNotAllowedError,
  assertModelAllowed,
  isFreeModelId,
  llmKeyMissing,
  resolveAgentModel,
  resolveLLMEndpoint,
  resolveVisionModel,
} from '@fricta/shared';
// Deep imports: the package root also opens a Redis connection (queue setup).
import { createAIProvider, OpenRouterProvider } from '@fricta/agent/dist/providers';
import { VisualAIAnalyzer } from '@fricta/visual-intelligence/dist/vision';

const ENV_KEYS = [
  'AGENT_MODEL', 'AGENT_VISION_MODEL', 'AGENT_BASE_URL', 'AGENT_API_KEY',
  'OPENROUTER_API_KEY', 'ALLOW_PAID_MODELS',
];
let saved: Record<string, string | undefined> = {};
beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  ENV_KEYS.forEach((k) => delete process.env[k]);
});
afterEach(() => {
  ENV_KEYS.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k])));
});

describe('free-model policy', () => {
  it('defaults are free, and the vision default is the image-capable Gemma 4 free variant', () => {
    expect(isFreeModelId(DEFAULT_FREE_AGENT_MODEL)).toBe(true);
    expect(DEFAULT_FREE_VISION_MODEL).toBe('google/gemma-4-31b-it:free');
    expect(resolveAgentModel({})).toBe(DEFAULT_FREE_AGENT_MODEL);
    expect(resolveVisionModel({})).toBe(DEFAULT_FREE_VISION_MODEL);
  });

  it('treats ":free" ids and the openrouter/free router as free, everything else as paid', () => {
    expect(isFreeModelId('meta-llama/llama-3.3-70b-instruct:free')).toBe(true);
    expect(isFreeModelId('openrouter/free')).toBe(true);
    expect(isFreeModelId('openai/gpt-4o-mini')).toBe(false);
    expect(isFreeModelId('google/gemini-2.5-flash')).toBe(false);
    expect(isFreeModelId('free')).toBe(false);
  });

  it('rejects a paid AGENT_MODEL / AGENT_VISION_MODEL loudly', () => {
    expect(() => resolveAgentModel({ AGENT_MODEL: 'openai/gpt-4o-mini' })).toThrow(PaidModelNotAllowedError);
    expect(() => resolveVisionModel({ AGENT_VISION_MODEL: 'google/gemini-2.5-flash' })).toThrow(/ALLOW_PAID_MODELS=true/);
  });

  it('only ALLOW_PAID_MODELS=true (exactly) opts in to paid models', () => {
    expect(() => assertModelAllowed('openai/gpt-4o-mini', 'AGENT_MODEL', { ALLOW_PAID_MODELS: '1' })).toThrow();
    expect(() => assertModelAllowed('openai/gpt-4o-mini', 'AGENT_MODEL', { ALLOW_PAID_MODELS: 'yes' })).toThrow();
    expect(() => assertModelAllowed('openai/gpt-4o-mini', 'AGENT_MODEL', { ALLOW_PAID_MODELS: 'true' })).not.toThrow();
  });

  it('createAIProvider refuses a paid model even with a key set', () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-v1-test';
    process.env.AGENT_MODEL = 'openai/gpt-4o-mini';
    expect(() => createAIProvider('openrouter')).toThrow(PaidModelNotAllowedError);
  });

  it('constructing the provider or vision analyzer directly with a paid model also throws', () => {
    expect(() => new OpenRouterProvider({ apiKey: 'k', model: 'openai/gpt-4o-mini' })).toThrow(PaidModelNotAllowedError);
    expect(() => new VisualAIAnalyzer({ apiKey: 'k', model: 'google/gemini-2.5-flash' })).toThrow(PaidModelNotAllowedError);
  });
});

describe('endpoint resolution', () => {
  it('defaults to OpenRouter and requires its key', () => {
    expect(resolveLLMEndpoint({}).baseUrl).toBe(OPENROUTER_BASE_URL);
    expect(llmKeyMissing({})).toBe(true);
    expect(llmKeyMissing({ OPENROUTER_API_KEY: 'sk-or-v1-x' })).toBe(false);
    expect(() => createAIProvider('openrouter')).toThrow(/OPENROUTER_API_KEY is not set/);
  });

  it('AGENT_BASE_URL selects another OpenAI-compatible endpoint, key optional', () => {
    const ep = resolveLLMEndpoint({ AGENT_BASE_URL: 'http://127.0.0.1:11434/v1/' });
    expect(ep).toEqual({ baseUrl: 'http://127.0.0.1:11434/v1', apiKey: '', isOpenRouter: false });
    expect(llmKeyMissing({ AGENT_BASE_URL: 'http://127.0.0.1:11434/v1' })).toBe(false);
  });

  it('AGENT_API_KEY takes precedence over OPENROUTER_API_KEY', () => {
    expect(resolveLLMEndpoint({ AGENT_API_KEY: 'a', OPENROUTER_API_KEY: 'b' }).apiKey).toBe('a');
  });
});

describe('provider factory against the local stub (STUB — not a live LLM)', () => {
  let server: any;
  let stats: any;
  let baseUrl = '';

  beforeAll(async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const stub = await import(path.resolve(__dirname, '../../../e2e/stub-llm-server.mjs'));
    server = stub.server;
    stats = stub.stats;
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
  });
  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  it('routes chat completions to AGENT_BASE_URL with the configured free model', async () => {
    process.env.AGENT_BASE_URL = baseUrl;
    const provider = createAIProvider('openrouter');
    expect(provider.getModel()).toBe(DEFAULT_FREE_AGENT_MODEL);
    const before = stats.planner;
    const res = await provider.chat([
      { role: 'system', content: 'sys' },
      { role: 'user', content: '## ACTION HISTORY\nNo actions taken yet.\n## TASK\n' },
    ]);
    expect(stats.planner).toBe(before + 1);
    expect(res.model).toBe(DEFAULT_FREE_AGENT_MODEL);
    expect(JSON.parse(res.content)).toMatchObject({ action: 'scroll', target: 'down' });
  });
});
