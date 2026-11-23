#!/usr/bin/env node
/**
 * OFFLINE rendering of a saved report payload (no backend, no DB, no provider
 * calls). Uses the same report-engine code and page.pdf() settings as
 * GET /api/reports/:id/export/pdf.
 *
 *   node apps/backend/scripts/render-report-fixture.mjs <payload.json> <out.pdf>
 *
 * Build first (npx turbo run build --filter=@fricta/report-engine). Set
 * PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH to use a preinstalled Chromium.
 * Also writes <out>.html next to the PDF for inspection.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { ExecutiveSummaryEngine, PDFRenderer } = require('@fricta/report-engine');
const { chromium } = require('playwright');

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('usage: render-report-fixture.mjs <payload.json> <out.pdf>');
  process.exit(2);
}
const payload = JSON.parse(fs.readFileSync(input, 'utf8'));
const executive = ExecutiveSummaryEngine.synthesize(payload);
const html = PDFRenderer.renderHTML(payload, executive);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output.replace(/\.pdf$/, '') + '.html', html);

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim() || undefined,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle' });
const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', bottom: '20px' } });
await browser.close();
fs.writeFileSync(output, pdf);
console.log(`wrote ${output} (${pdf.length} bytes); grade=${executive.overallUXGrade} score=${executive.overallScore} insights=${executive.synthesizedInsights.length}`);
