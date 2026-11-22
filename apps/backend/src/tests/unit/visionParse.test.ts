import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DEFAULT_LLM_RETRY_POLICY, isFreeModelId } from '@fricta/shared';
import { computeVisualCoverage } from '@fricta/report-engine';
// Deep imports: the package root also opens a Redis connection.
import { VisualAIAnalyzer, parseVisionAnswer, VISION_LIMITS } from '@fricta/visual-intelligence/dist/vision';
import { repairTruncatedJson, extractJsonText } from '@fricta/visual-intelligence/dist/vision/jsonRepair';

const box = (i: number) => ({ x: 10 * i, y: 20, w: 100, h: 40, label: `Issue ${i}` });
const full = JSON.stringify({ explanation: 'The primary CTA competes with a secondary link.', clarityFeedback: 'Reduce nav items.', annotatedBoxes: [box(1), box(2), box(3)] });

// The real failure mode: cut off mid-string around ~1,260 characters.
const cutMidExplanation = `{"explanation":"${'The hero section is dense and the pricing link is easy to miss. '.repeat(20)}`.slice(0, 1260);
const cutMidSecondBox = full.slice(0, full.indexOf('"Issue 2"') + 5); // inside box 2's label

describe('repairTruncatedJson (bounded)', () => {
  it('parses complete JSON untouched, also inside ``` fences or after prose', () => {
    expect(repairTruncatedJson(full)).toEqual({ value: JSON.parse(full), repaired: false });
    expect(repairTruncatedJson('```json\n' + full + '\n```')?.repaired).toBe(false);
    expect(extractJsonText('Here you go: ' + full)).toBe(full);
  });

  it('closes an unterminated top-level string (the "Unterminated string in JSON" case)', () => {
    expect(() => JSON.parse(cutMidExplanation)).toThrow(/Unterminated string/);
    const r = repairTruncatedJson(cutMidExplanation)!;
    expect(r.repaired).toBe(true);
    expect((r.value as any).explanation.length).toBeGreaterThan(1000);
  });

  it('cuts a half-written nested string back to the last complete element', () => {
    const r = repairTruncatedJson(cutMidSecondBox)!;
    expect(r.repaired).toBe(true);
    const boxes = (r.value as any).annotatedBoxes;
    expect(boxes[0]).toEqual(box(1));
    // The repair is schema-agnostic: box 2 keeps its complete fields but loses
    // the half-written label (never a truncated label string)...
    expect(boxes[1]?.label).toBeUndefined();
    // ...and schema validation then drops it as incomplete.
    expect(parseVisionAnswer(cutMidSecondBox, 'length')!.annotatedBoxes).toEqual([box(1)]);
  });

  it('handles an unclosed ```json fence and a trailing comma / dangling key', () => {
    expect((repairTruncatedJson('```json\n{"explanation":"ok","annotatedBoxes":[' + JSON.stringify(box(1)) + ',')!.value as any).annotatedBoxes).toEqual([box(1)]);
    expect(repairTruncatedJson('{"explanation":"ok","clarityFeedback":')!.value).toEqual({ explanation: 'ok' });
  });

  it('gives up (null) on text with no JSON, and on oversized input', () => {
    expect(repairTruncatedJson('I cannot help with that.')).toBeNull();
    expect(repairTruncatedJson('{"a":"' + 'x'.repeat(60_000))).toBeNull();
  });
});

describe('parseVisionAnswer', () => {
  it('marks finish_reason=length as truncated even when the JSON happens to parse', () => {
    expect(parseVisionAnswer(full, 'length')?.truncated).toBe(true);
    expect(parseVisionAnswer(full, 'stop')?.truncated).toBe(false);
    expect(parseVisionAnswer(full, 'MAX_TOKENS')?.truncated).toBe(true);
  });

  it('keeps only complete, well-formed boxes and enforces the requested limits', () => {
    const many = JSON.stringify({
      explanation: 'e'.repeat(1000), clarityFeedback: 'c',
      annotatedBoxes: [...Array.from({ length: 8 }, (_, i) => box(i + 1)), { x: 1, y: 2, label: 'no size' }, { x: 1, y: 2, w: 3, h: 4 }],
    });
    const p = parseVisionAnswer(many, 'stop')!;
    expect(p.annotatedBoxes).toHaveLength(VISION_LIMITS.maxBoxes);
    expect(p.explanation).toHaveLength(VISION_LIMITS.explanationChars);
  });

  it('returns null when nothing usable can be recovered', () => {
    expect(parseVisionAnswer('{"explan', 'length')).toBeNull();
    expect(parseVisionAnswer('not json at all', 'stop')).toBeNull();
  });
});

// ─── Analyzer with fake responses ────────────────────────────────────────────

type Reply = { status: number; content?: string; finish?: string };
function fakeFetch(replies: Reply[]) {
  const bodies: any[] = [];
  const impl = (async (_url: any, init: any) => {
    const body = JSON.parse(init.body);
    bodies.push(body);
    const r = replies[Math.min(bodies.length - 1, replies.length - 1)];
    const payload = r.status === 200
      ? { model: body.model, choices: [{ finish_reason: r.finish ?? 'stop', message: { content: r.content ?? '' } }] }
      : { error: { message: 'rate limited' } };
    return new Response(JSON.stringify(payload), { status: r.status, headers: { 'Content-Type': 'application/json' } });
  }) as unknown as typeof fetch;
  return { impl, bodies };
}
const deps = (f: { impl: typeof fetch }) => ({ fetch: f.impl, sleep: async () => {}, random: () => 0, now: () => 0, retryPolicy: DEFAULT_LLM_RETRY_POLICY });
const OR = 'https://openrouter.ai/api/v1';
const MODEL = 'google/gemma-4-31b-it:free';

describe('VisualAIAnalyzer: truncated / length / empty answers (fake responses)', () => {
  let img: string;
  beforeEach(() => {
    img = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vparse-')), 'shot.png');
    fs.writeFileSync(img, Buffer.from('89504e470d0a1a0a', 'hex'));
  });
  const analyzer = (f: { impl: typeof fetch }) => new VisualAIAnalyzer({ apiKey: 'k', model: MODEL, baseUrl: OR }, deps(f));

  it('asks for bounded output with a sensible max_tokens', async () => {
    const f = fakeFetch([{ status: 200, content: full }]);
    const r = await analyzer(f).analyzeScreenshot(img, 'ctx');
    expect(r.status).toBe('ok');
    expect(r.truncated).toBeUndefined();
    expect(f.bodies[0].max_tokens).toBeGreaterThanOrEqual(1000);
    const prompt = f.bodies[0].messages[0].content[0].text as string;
    expect(prompt).toMatch(/at most 5 items/);
    expect(prompt).toMatch(/at most 400 characters/);
  });

  it('truncated answer → one shorter retry; a complete retry replaces the partial one', async () => {
    const f = fakeFetch([{ status: 200, content: cutMidSecondBox, finish: 'length' }, { status: 200, content: full }]);
    const r = await analyzer(f).analyzeScreenshot(img, 'ctx');
    expect(r.status).toBe('ok');
    expect(r.truncated).toBeUndefined();
    expect(r.annotatedBoxes).toHaveLength(3);
    expect(f.bodies).toHaveLength(2);
    expect(f.bodies[1].messages[0].content[0].text).toMatch(/at most 3 items/);
  });

  it('if the retry is also cut off, keeps the repaired partial answer and flags it truncated', async () => {
    const f = fakeFetch([{ status: 200, content: cutMidSecondBox, finish: 'length' }, { status: 200, content: '{"explan', finish: 'length' }]);
    const r = await analyzer(f).analyzeScreenshot(img, 'ctx');
    expect(r.status).toBe('ok');
    expect(r.truncated).toBe(true);
    expect(r.annotatedBoxes).toEqual([box(1)]);
  });

  it('unparseable twice → status failed (coverage stays incomplete), never a fake clean result', async () => {
    const f = fakeFetch([{ status: 200, content: 'Sorry, I cannot see the image.' }, { status: 200, content: '{"explan', finish: 'length' }]);
    const r = await analyzer(f).analyzeScreenshot(img, 'ctx');
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/unparseable/);
    expect(r.annotatedBoxes).toEqual([]);
    expect(f.bodies).toHaveLength(2); // exactly one parse retry
  });

  it('empty responses are retried by the transport layer before parsing', async () => {
    const f = fakeFetch([{ status: 200, content: '' }, { status: 200, content: '' }, { status: 200, content: full }]);
    const r = await analyzer(f).analyzeScreenshot(img, 'ctx');
    expect(r.status).toBe('ok');
    expect(f.bodies).toHaveLength(3);
    expect(f.bodies.every((b) => isFreeModelId(b.model))).toBe(true);
  });

  it('honours AGENT_VISION_MAX_TOKENS', async () => {
    process.env.AGENT_VISION_MAX_TOKENS = '1600';
    try {
      const f = fakeFetch([{ status: 200, content: full }]);
      await analyzer(f).analyzeScreenshot(img, 'ctx');
      expect(f.bodies[0].max_tokens).toBe(1600);
    } finally {
      delete process.env.AGENT_VISION_MAX_TOKENS;
    }
  });
});

describe('coverage with truncated vision answers', () => {
  it('a repaired (cut-off) answer makes coverage partial, not complete', () => {
    const c = computeVisualCoverage({
      screenshots: 2, analyzed: true,
      visualFindings: [
        { findingType: 'vision_summary', screenshotId: 'a', metadata: { truncated: true } },
        { findingType: 'vision_summary', screenshotId: 'b', metadata: { truncated: false } },
      ],
    });
    expect(c).toMatchObject({ status: 'partial', complete: false, visionTruncated: 1, visionSucceeded: 2 });
    expect(c.note).toMatch(/cut off/);
  });
});
