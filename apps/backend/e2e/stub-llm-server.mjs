#!/usr/bin/env node
/**
 * ============================================================================
 *  STUB — NOT A LIVE LLM.
 * ============================================================================
 * A deterministic, OpenAI-compatible HTTP server for local end-to-end tests
 * of the Fricta audit pipeline. It does no inference: every reply comes from
 * a fixed script keyed off the request, so the real backend, worker, browser,
 * database and report code can be exercised with zero network and zero spend.
 *
 * Results obtained against this server prove that the plumbing works. They
 * prove nothing about how a real model behaves (output quality, JSON
 * adherence, latency, rate limits, vision accuracy).
 *
 * Endpoints (OpenAI-compatible subset):
 *   GET  /v1/models               — lists the requested model ids, labelled stub
 *   POST /v1/chat/completions     — scripted planner / vision replies
 *   GET  /__stub/stats            — request counters (for test assertions)
 *   POST /__stub/mode             — failure injection, e.g. {"vision":"429"}:
 *                                   planner / vision ∈ ok | 429 | empty;
 *                                   vision also ∈ truncated (JSON cut off
 *                                   mid-string, finish_reason "length") and
 *                                   slow (normal answer after STUB_SLOW_MS,
 *                                   default 2500 ms: a slow model).
 *                                   429s carry "Retry-After: 0" so retries are
 *                                   instant (and the header path is exercised).
 *
 * Every response carries `X-Fricta-Stub: true` and
 * `system_fingerprint: "fricta-llm-stub"`.
 *
 * Planner script (text requests), driven by the prompt the agent sends:
 *   - no actions yet               → scroll down
 *   - URL contains "/pricing"      → wait goal_complete
 *   - page lists no links, buttons
 *     or inputs at all             → wait dead_end
 *   - a "Pricing" link is listed   → click "Pricing"
 *   - 4+ actions taken             → wait dead_end
 *   - otherwise                    → scroll down
 * Vision script (requests carrying an image_url part):
 *   → JSON with explanation, clarityFeedback and one annotated box.
 *
 * Usage: node stub-llm-server.mjs [port]   (default 4010, or STUB_LLM_PORT)
 */
import http from 'node:http';

const port = Number(process.argv[2] || process.env.STUB_LLM_PORT || 4010);
const stats = { chat: 0, planner: 0, vision: 0, models: 0, malformed: 0, planner429: 0, plannerEmpty: 0, vision429: 0, visionEmpty: 0, visionTruncated: 0 };
const mode = { planner: 'ok', vision: 'ok' };

function send(res, status, body, extraHeaders = {}) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json),
    'X-Fricta-Stub': 'true',
    ...extraHeaders,
  });
  res.end(json);
}

function textOf(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((p) => (p && p.type === 'text' ? p.text : '')).join('\n');
  return '';
}

function hasImage(messages) {
  return messages.some((m) => Array.isArray(m.content) && m.content.some((p) => p && p.type === 'image_url'));
}

export function plannerReply(prompt) {
  const historyBlock = (prompt.split('## ACTION HISTORY')[1] || '').split('## TASK')[0] || '';
  const steps = (historyBlock.match(/^Step \d+:/gm) || []).length;
  const url = (prompt.match(/^URL: (.*)$/m) || [])[1] || '';
  const linksBlock = (prompt.split('Links:')[1] || '').split('Input Fields')[0] || '';

  if (steps === 0) return { thought: 'Scan the page before acting.', action: 'scroll', target: 'down' };
  if (/\/pricing/i.test(url)) return { thought: 'Pricing page reached; goal met.', action: 'wait', target: 'goal_complete' };
  if (/Buttons: none/.test(prompt) && /Links: none/.test(prompt) && /Input Fields: none/.test(prompt)) {
    return { thought: 'Cannot proceed — page has no interactive elements.', action: 'wait', target: 'dead_end' };
  }
  if (steps >= 4) return { thought: 'Cannot proceed — no pricing entry point found.', action: 'wait', target: 'dead_end' };
  if (/^\s*- Pricing\b/m.test(linksBlock)) return { thought: 'Pricing link visible; open it.', action: 'click', target: 'Pricing' };
  return { thought: 'Keep looking for pricing.', action: 'scroll', target: 'down' };
}

export function visionReply() {
  return {
    explanation: '[STUB] Scripted vision reply — no image was actually analysed.',
    clarityFeedback: '[STUB] Fixed feedback from the local test stub.',
    annotatedBoxes: [{ x: 40, y: 40, w: 200, h: 60, label: '[STUB] Example annotated region' }],
  };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/__stub/stats') return send(res, 200, { stub: true, mode, ...stats });
  if (req.method === 'POST' && url.pathname === '/__stub/mode') {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      try {
        const next = JSON.parse(raw || '{}');
        for (const k of ['planner', 'vision']) if (['ok', '429', 'empty', 'truncated', 'slow'].includes(next[k])) mode[k] = next[k];
        return send(res, 200, { stub: true, mode });
      } catch { return send(res, 400, { error: { message: 'invalid JSON' } }); }
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/v1/models') {
    stats.models++;
    return send(res, 200, {
      object: 'list',
      data: [{ id: 'fricta-stub:free', object: 'model', owned_by: 'fricta-llm-stub', description: 'STUB — not a live LLM' }],
    });
  }

  if (req.method === 'POST' && url.pathname === '/v1/chat/completions') {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', async () => {
      let body;
      try { body = JSON.parse(raw); } catch { stats.malformed++; return send(res, 400, { error: { message: 'invalid JSON body' } }); }
      const messages = Array.isArray(body.messages) ? body.messages : [];
      if (!body.model || messages.length === 0) { stats.malformed++; return send(res, 400, { error: { message: 'model and messages are required' } }); }
      stats.chat++;

      const kind = hasImage(messages) ? 'vision' : 'planner';
      if (mode[kind] === '429') {
        stats[`${kind}429`]++;
        return send(res, 429, { error: { message: '[STUB] Rate limit exceeded: upstream' } }, { 'Retry-After': '0' });
      }
      if (mode[kind] === 'empty') {
        stats[`${kind}Empty`]++;
        return send(res, 200, { id: 'stub-empty', object: 'chat.completion', model: body.model, system_fingerprint: 'fricta-llm-stub',
          choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: '' } }] });
      }

      if (kind === 'vision' && mode.vision === 'slow') {
        stats.visionSlow = (stats.visionSlow || 0) + 1;
        await new Promise((r) => setTimeout(r, Number(process.env.STUB_SLOW_MS || 2500)));
      }
      if (kind === 'vision' && mode.vision === 'truncated') {
        // One complete box, then the answer stops mid-way through the second
        // box's label — like a real model hitting max_tokens.
        stats.visionTruncated++;
        const cut = '{"explanation":"[STUB] Truncated answer test.","clarityFeedback":"[STUB]","annotatedBoxes":[{"x":40,"y":40,"w":200,"h":60,"label":"[STUB] complete box"},{"x":300,"y":40,"w":120,"h":40,"label":"[STUB] this label is cut';
        return send(res, 200, { id: 'stub-trunc', object: 'chat.completion', model: body.model, system_fingerprint: 'fricta-llm-stub',
          choices: [{ index: 0, finish_reason: 'length', message: { role: 'assistant', content: cut } }] });
      }

      let content;
      if (hasImage(messages)) {
        stats.vision++;
        content = '```json\n' + JSON.stringify(visionReply()) + '\n```';
      } else {
        stats.planner++;
        const lastUser = [...messages].reverse().find((m) => m.role === 'user');
        content = JSON.stringify(plannerReply(textOf(lastUser && lastUser.content)));
      }

      return send(res, 200, {
        id: `stub-${Date.now()}-${stats.chat}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: body.model,
        system_fingerprint: 'fricta-llm-stub',
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      });
    });
    return;
  }

  send(res, 404, { error: { message: `stub: no route for ${req.method} ${url.pathname}` } });
});

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  server.listen(port, '127.0.0.1', () => {
    console.log(`[fricta-llm-stub] STUB (not a live LLM) listening on http://127.0.0.1:${port}/v1`);
  });
}

export { server, stats };
