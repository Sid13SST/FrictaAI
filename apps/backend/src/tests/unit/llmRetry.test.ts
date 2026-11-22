import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  serverRequestedDelayMs,
  backoffDelayMs,
  retryDelayMs,
  DEFAULT_LLM_RETRY_POLICY,
  OPENROUTER_FREE_ROUTER,
  isFreeModelId,
} from '@fricta/shared';
// Deep imports: the package roots also open Redis connections.
import { OpenRouterProvider } from '@fricta/agent/dist/providers';
import { VisualAIAnalyzer } from '@fricta/visual-intelligence/dist/vision';

// ─── Fake fetch ──────────────────────────────────────────────────────────────

type Reply = { status: number; body?: unknown; headers?: Record<string, string> } | 'network-error';
const ok = (content: string) => ({ status: 200, body: { model: 'served-model', choices: [{ message: { content } }] } });
const rateLimited = (headers: Record<string, string> = {}) => ({ status: 429, body: { error: { message: 'Rate limit exceeded: upstream' } }, headers });
const empty = () => ({ status: 200, body: { choices: [{ message: { content: '' } }] } });

function fakeFetch(script: (model: string, call: number) => Reply) {
  const calls: Array<{ url: string; model: string; auth: string | null }> = [];
  const impl = (async (url: any, init: any) => {
    const req = JSON.parse(init.body);
    calls.push({ url: String(url), model: req.model, auth: init.headers?.Authorization ?? null });
    const reply = script(req.model, calls.length);
    if (reply === 'network-error') throw new TypeError('fetch failed');
    return new Response(reply.body === undefined ? '' : JSON.stringify(reply.body), {
      status: reply.status,
      headers: { 'Content-Type': 'application/json', ...(reply.headers ?? {}) },
    });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

function deps(f: { impl: typeof fetch }) {
  const sleeps: number[] = [];
  return {
    sleeps,
    deps: { fetch: f.impl, sleep: async (ms: number) => { sleeps.push(ms); }, random: () => 0.5, now: () => 1_700_000_000_000 },
  };
}

const OR = 'https://openrouter.ai/api/v1';
const MODEL = 'google/gemma-4-31b-it:free';
const msgs = [{ role: 'user' as const, content: 'hi' }];

let saved: string | undefined;
beforeEach(() => { saved = process.env.ALLOW_PAID_MODELS; delete process.env.ALLOW_PAID_MODELS; });
afterEach(() => { if (saved === undefined) delete process.env.ALLOW_PAID_MODELS; else process.env.ALLOW_PAID_MODELS = saved; });

// ─── Retry timing ────────────────────────────────────────────────────────────

describe('retry timing', () => {
  const now = 1_700_000_000_000;
  it('honours Retry-After in seconds and as an HTTP date', () => {
    expect(serverRequestedDelayMs({ 'Retry-After': '7' }, now)).toBe(7000);
    expect(serverRequestedDelayMs({ 'retry-after': new Date(now + 3000).toUTCString() }, now)).toBe(3000);
  });

  it('honours X-RateLimit-Reset as epoch ms (OpenRouter), epoch s, or seconds', () => {
    expect(serverRequestedDelayMs({ 'X-RateLimit-Reset': String(now + 4000) }, now)).toBe(4000);
    expect(serverRequestedDelayMs({ 'X-RateLimit-Reset': String(Math.floor(now / 1000) + 6) }, now)).toBe(6000);
    expect(serverRequestedDelayMs({ 'X-RateLimit-Reset': '2' }, now)).toBe(2000);
  });

  it('works with a real Headers object and returns null without hints', () => {
    expect(serverRequestedDelayMs(new Headers({ 'retry-after': '1' }), now)).toBe(1000);
    expect(serverRequestedDelayMs(new Headers(), now)).toBeNull();
    expect(serverRequestedDelayMs({ 'Retry-After': 'soon' }, now)).toBeNull();
  });

  it('backs off exponentially with full jitter, capped at 20 s', () => {
    const top = () => 1;
    expect([1, 2, 3, 4, 5, 6].map((a) => backoffDelayMs(a, DEFAULT_LLM_RETRY_POLICY, top))).toEqual([1000, 2000, 4000, 8000, 16000, 20000]);
    expect(backoffDelayMs(3, DEFAULT_LLM_RETRY_POLICY, () => 0)).toBe(0);
    expect(backoffDelayMs(3, DEFAULT_LLM_RETRY_POLICY, () => 0.25)).toBe(1000);
  });

  it('caps a server-requested wait at 20 s too', () => {
    expect(retryDelayMs(1, { 'Retry-After': '3600' }, DEFAULT_LLM_RETRY_POLICY, () => 0.5, now)).toBe(20_000);
    expect(retryDelayMs(1, { 'Retry-After': '0' }, DEFAULT_LLM_RETRY_POLICY, () => 0.5, now)).toBe(0);
  });

  it('uses 5 attempts by default', () => {
    expect(DEFAULT_LLM_RETRY_POLICY.maxAttempts).toBe(5);
    expect(DEFAULT_LLM_RETRY_POLICY.maxDelayMs).toBe(20_000);
  });
});

// ─── Agent provider ──────────────────────────────────────────────────────────

describe('OpenRouterProvider retries (fake fetch)', () => {
  it('retries 429s honouring Retry-After, then succeeds on the same model', async () => {
    const f = fakeFetch((_m, n) => (n <= 2 ? rateLimited({ 'Retry-After': '3' }) : ok('{"action":"scroll"}')));
    const d = deps(f);
    const p = new OpenRouterProvider({ apiKey: 'k', model: MODEL, baseUrl: OR }, d.deps);
    const res = await p.chat(msgs);
    expect(res.content).toBe('{"action":"scroll"}');
    expect(f.calls.map((c) => c.model)).toEqual([MODEL, MODEL, MODEL]);
    expect(d.sleeps).toEqual([3000, 3000]);
  });

  it('uses jittered exponential backoff when no header is given', async () => {
    const f = fakeFetch((_m, n) => (n <= 3 ? rateLimited() : ok('x')));
    const d = deps(f);
    await new OpenRouterProvider({ apiKey: 'k', model: MODEL, baseUrl: OR }, d.deps).chat(msgs);
    expect(d.sleeps).toEqual([500, 1000, 2000]); // random=0.5 × 1s/2s/4s
  });

  it('after 5 rate-limited attempts falls back ONCE to openrouter/free and keeps using it', async () => {
    const f = fakeFetch((m) => (m === MODEL ? rateLimited() : ok('from-free-router')));
    const d = deps(f);
    const p = new OpenRouterProvider({ apiKey: 'k', model: MODEL, baseUrl: OR }, d.deps);
    const res = await p.chat(msgs);
    expect(res.content).toBe('from-free-router');
    expect(f.calls.map((c) => c.model)).toEqual([MODEL, MODEL, MODEL, MODEL, MODEL, OPENROUTER_FREE_ROUTER]);
    expect(p.getModel()).toBe(OPENROUTER_FREE_ROUTER);
    expect(isFreeModelId(p.getModel())).toBe(true);
  });

  it('treats empty content as retryable and falls back after retries', async () => {
    const f = fakeFetch((m) => (m === MODEL ? empty() : ok('filled')));
    const res = await new OpenRouterProvider({ apiKey: 'k', model: MODEL, baseUrl: OR }, deps(f).deps).chat(msgs);
    expect(res.content).toBe('filled');
    expect(f.calls.filter((c) => c.model === MODEL)).toHaveLength(5);
  });

  it('throws (no infinite loop, no paid model) when the fallback also fails', async () => {
    const f = fakeFetch(() => rateLimited());
    const p = new OpenRouterProvider({ apiKey: 'k', model: MODEL, baseUrl: OR }, deps(f).deps);
    await expect(p.chat(msgs)).rejects.toThrow(/openrouter\/free/);
    expect(f.calls).toHaveLength(10);
    expect(f.calls.every((c) => isFreeModelId(c.model))).toBe(true);
  });

  it('does not fall back when already on openrouter/free', async () => {
    const f = fakeFetch(() => rateLimited());
    await expect(new OpenRouterProvider({ apiKey: 'k', model: OPENROUTER_FREE_ROUTER, baseUrl: OR }, deps(f).deps).chat(msgs)).rejects.toThrow();
    expect(f.calls).toHaveLength(5);
  });

  it('does not fall back on non-OpenRouter endpoints (no free router there)', async () => {
    const f = fakeFetch(() => rateLimited());
    await expect(new OpenRouterProvider({ apiKey: '', model: MODEL, baseUrl: 'http://127.0.0.1:4010/v1' }, deps(f).deps).chat(msgs)).rejects.toThrow();
    expect(f.calls.map((c) => c.model)).toEqual(Array(5).fill(MODEL));
    expect(f.calls[0].auth).toBeNull(); // no key → no Authorization header
  });

  it('falls back immediately on 404 (rotated free variant), without retrying', async () => {
    const f = fakeFetch((m) => (m === MODEL ? { status: 404, body: { error: { message: 'No endpoints found' } } } : ok('ok')));
    await new OpenRouterProvider({ apiKey: 'k', model: MODEL, baseUrl: OR }, deps(f).deps).chat(msgs);
    expect(f.calls.map((c) => c.model)).toEqual([MODEL, OPENROUTER_FREE_ROUTER]);
  });

  it('does not retry non-retryable client errors (e.g. 401)', async () => {
    const f = fakeFetch(() => ({ status: 401, body: { error: { message: 'bad key' } } }));
    await expect(new OpenRouterProvider({ apiKey: 'k', model: MODEL, baseUrl: OR }, deps(f).deps).chat(msgs)).rejects.toThrow(/HTTP 401/);
    expect(f.calls).toHaveLength(1);
  });

  it('retries network errors', async () => {
    const f = fakeFetch((_m, n) => (n === 1 ? 'network-error' : ok('back')));
    expect((await new OpenRouterProvider({ apiKey: 'k', model: MODEL, baseUrl: OR }, deps(f).deps).chat(msgs)).content).toBe('back');
  });

  it('stops waiting once the total wait budget is spent', async () => {
    const f = fakeFetch((m) => (m === MODEL ? rateLimited({ 'Retry-After': '20' }) : ok('x')));
    const d = deps(f);
    const p = new OpenRouterProvider({ apiKey: 'k', model: MODEL, baseUrl: OR }, { ...d.deps, retryPolicy: { ...DEFAULT_LLM_RETRY_POLICY, maxTotalWaitMs: 45_000 } });
    await p.chat(msgs);
    expect(d.sleeps).toEqual([20_000, 20_000]); // third 20 s wait would exceed 45 s → fall back
    expect(f.calls.map((c) => c.model)).toEqual([MODEL, MODEL, MODEL, OPENROUTER_FREE_ROUTER]);
  });
});

// ─── Vision analyzer ─────────────────────────────────────────────────────────

describe('VisualAIAnalyzer retries (fake fetch)', () => {
  let img: string;
  beforeEach(() => {
    img = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vision-')), 'shot.png');
    fs.writeFileSync(img, Buffer.from('89504e470d0a1a0a', 'hex'));
  });
  const visionJson = JSON.stringify({ explanation: 'e', clarityFeedback: 'c', annotatedBoxes: [{ x: 1, y: 2, w: 3, h: 4, label: 'l' }] });

  it('retries 429 (X-RateLimit-Reset) and returns status ok', async () => {
    const f = fakeFetch((_m, n) => (n === 1 ? rateLimited({ 'X-RateLimit-Reset': String(1_700_000_000_000 + 2500) }) : ok(visionJson)));
    const d = deps(f);
    const r = await new VisualAIAnalyzer({ apiKey: 'k', model: MODEL, baseUrl: OR }, d.deps).analyzeScreenshot(img, 'ctx');
    expect(r.status).toBe('ok');
    expect(r.annotatedBoxes).toHaveLength(1);
    expect(d.sleeps).toEqual([2500]);
  });

  it('treats empty content as retryable', async () => {
    const f = fakeFetch((_m, n) => (n <= 2 ? empty() : ok(visionJson)));
    const r = await new VisualAIAnalyzer({ apiKey: 'k', model: MODEL, baseUrl: OR }, deps(f).deps).analyzeScreenshot(img, 'ctx');
    expect(r.status).toBe('ok');
    expect(f.calls).toHaveLength(3);
  });

  it('falls back once to openrouter/free after retries, and reports which model answered', async () => {
    const f = fakeFetch((m) => (m === MODEL ? rateLimited() : ok(visionJson)));
    const r = await new VisualAIAnalyzer({ apiKey: 'k', model: MODEL, baseUrl: OR }, deps(f).deps).analyzeScreenshot(img, 'ctx');
    expect(r.status).toBe('ok');
    expect(f.calls.map((c) => c.model)).toEqual([...Array(5).fill(MODEL), OPENROUTER_FREE_ROUTER]);
  });

  it('reports status failed (not clean findings) when everything is rate-limited or empty', async () => {
    const f = fakeFetch((_m, n) => (n % 2 ? rateLimited() : empty()));
    const r = await new VisualAIAnalyzer({ apiKey: 'k', model: MODEL, baseUrl: OR }, deps(f).deps).analyzeScreenshot(img, 'ctx');
    expect(r.status).toBe('failed');
    expect(r.annotatedBoxes).toEqual([]);
    expect(r.reason).toMatch(/rate_limited|empty/);
    expect(f.calls).toHaveLength(10);
    expect(f.calls.every((c) => isFreeModelId(c.model))).toBe(true);
  });

  it('reports status skipped when no OpenRouter key is configured', async () => {
    const f = fakeFetch(() => ok(visionJson));
    const saved = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    try {
      const r = await new VisualAIAnalyzer({ model: MODEL, baseUrl: OR }, deps(f).deps).analyzeScreenshot(img, 'ctx');
      expect(r.status).toBe('skipped');
      expect(f.calls).toHaveLength(0);
    } finally {
      if (saved !== undefined) process.env.OPENROUTER_API_KEY = saved;
    }
  });
});
