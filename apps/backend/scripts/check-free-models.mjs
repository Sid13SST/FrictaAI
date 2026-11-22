#!/usr/bin/env node
/**
 * Re-check that the configured models are still free on OpenRouter, and that
 * the vision model still accepts image input. Uses the PUBLIC models API
 * (no API key, no cost): GET https://openrouter.ai/api/v1/models
 *
 *   npm run check:models --workspace=@fricta/backend
 *
 * Reads AGENT_MODEL / AGENT_VISION_MODEL (defaults: google/gemma-4-31b-it:free).
 * Exit code 0 = both listed with $0 prompt+completion pricing (and image input
 * for the vision model); 1 = something changed; 2 = the API was unreachable.
 *
 * OPENROUTER_MODELS_FILE=<path> checks a saved copy of the API response instead
 * (offline use, or to test this script).
 *
 * OpenRouter rotates free variants without notice. Run this before a release
 * and whenever audits start failing with "404 No endpoints found".
 */
const DEFAULT = 'google/gemma-4-31b-it:free';
const agentModel = process.env.AGENT_MODEL?.trim() || DEFAULT;
const visionModel = process.env.AGENT_VISION_MODEL?.trim() || DEFAULT;

let data;
if (process.env.OPENROUTER_MODELS_FILE) {
  const fs = await import('node:fs');
  data = JSON.parse(fs.readFileSync(process.env.OPENROUTER_MODELS_FILE, 'utf8')).data;
} else try {
  const res = await fetch('https://openrouter.ai/api/v1/models', { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  data = (await res.json()).data;
} catch (err) {
  console.error(`[check:models] Could not reach the OpenRouter models API: ${err.message}`);
  process.exit(2);
}

const byId = new Map(data.map((m) => [m.id, m]));
let ok = true;
for (const [role, id, needsImage] of [['AGENT_MODEL', agentModel, false], ['AGENT_VISION_MODEL', visionModel, true]]) {
  const m = byId.get(id);
  if (!m) { console.error(`✗ ${role}=${id} is no longer listed on OpenRouter`); ok = false; continue; }
  const free = Number(m.pricing?.prompt) === 0 && Number(m.pricing?.completion) === 0;
  const image = (m.architecture?.input_modalities || []).includes('image');
  console.log(`${free && (!needsImage || image) ? '✓' : '✗'} ${role}=${id}  prompt=${m.pricing?.prompt} completion=${m.pricing?.completion}  input=${(m.architecture?.input_modalities || []).join('+')}  context=${m.context_length}`);
  if (!free) ok = false;
  if (needsImage && !image) ok = false;
}
if (!ok) {
  const alternatives = data
    .filter((m) => m.id.endsWith(':free') && (m.architecture?.input_modalities || []).includes('image'))
    .map((m) => m.id);
  console.error(`Free image-capable models currently listed: ${alternatives.join(', ') || '(none)'}`);
}
process.exit(ok ? 0 : 1);
