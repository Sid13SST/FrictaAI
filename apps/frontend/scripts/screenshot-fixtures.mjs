#!/usr/bin/env node
/**
 * DEV-ONLY — screenshots the fixture harness at 390 / 768 / 1440 px.
 *
 *   npm run fixtures -w @fricta/frontend              # terminal 1 (port 3100)
 *   npm run fixtures:screenshots -w @fricta/frontend  # terminal 2
 *
 * Output: docs/verification/v1-frontend/screenshots/<width>/<name>.png plus a
 * layout-report.json listing horizontal overflow and browser errors per shot.
 * Every request that isn't to the local harness is blocked, so nothing here
 * touches Clerk, the backend, an LLM, or any other external service.
 *
 * Env: FIXTURES_URL (default http://127.0.0.1:3100), CHROMIUM_PATH (optional
 * browser binary), ONLY (comma-separated shot names to re-take).
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.FIXTURES_URL ?? 'http://127.0.0.1:3100';
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../docs/verification/v1-frontend/screenshots');
const WIDTHS = [390, 768, 1440];
const HEIGHTS = { 390: 844, 768: 1024, 1440: 900 };

const DONE = 'fx-session-completed-0001';
const RUNNING = 'fx-session-running-0002';
const QUEUED = 'fx-session-queued-0003';

/** name, path, scenario (?fx=), extra query, optional `after(page)` hook */
const SHOTS = [
  // ── The twelve pages, populated ──
  { name: 'landing', path: '/', scrollThrough: true },
  { name: 'login', path: '/login' },
  { name: 'register', path: '/register' },
  { name: 'dashboard', path: '/app' },
  { name: 'projects', path: '/app/projects' },
  { name: 'project-detail', path: '/app/projects/fx-project-1' },
  { name: 'workflow-monitor', path: `/app/monitor/${RUNNING}` },
  { name: 'reports', path: '/app/reports' },
  { name: 'report-details', path: `/app/reports/${DONE}` },
  { name: 'report-details-findings', path: `/app/reports/${DONE}`, after: p => p.getByRole('button', { name: 'UX Findings' }).click() },
  { name: 'investigation-console', path: `/app/console/${DONE}` },
  { name: 'investigation-console-evidence', path: `/app/console/${DONE}`, desktopOnly: true, after: p => p.getByRole('button', { name: 'Evidence Explorer' }).click() },
  { name: 'runtime-observability', path: '/app/runtime' },
  { name: 'help-center', path: '/app/help' },
  // ── Empty states ──
  { name: 'dashboard--empty', path: '/app', fx: 'empty' },
  { name: 'dashboard--no-audits', path: '/app', fx: 'populated', noAudits: true },
  { name: 'projects--empty', path: '/app/projects', fx: 'empty' },
  { name: 'project-detail--empty', path: '/app/projects/fx-project-3' },
  { name: 'reports--empty', path: '/app/reports', fx: 'empty' },
  { name: 'investigation-console--empty', path: '/app/console', fx: 'empty' },
  { name: 'runtime-observability--empty', path: '/app/runtime', fx: 'empty' },
  // ── Loading states ──
  { name: 'dashboard--loading', path: '/app', fx: 'loading' },
  { name: 'projects--loading', path: '/app/projects', fx: 'loading' },
  { name: 'reports--loading', path: '/app/reports', fx: 'loading' },
  { name: 'report-details--loading', path: `/app/reports/${DONE}`, fx: 'loading' },
  { name: 'workflow-monitor--connecting', path: `/app/monitor/${RUNNING}`, fx: 'loading' },
  { name: 'workflow-monitor--queued', path: `/app/monitor/${QUEUED}` },
  { name: 'runtime-observability--loading', path: '/app/runtime', fx: 'loading' },
  { name: 'login--widget-loading', path: '/login', query: 'fxAuth=loading' },
  { name: 'login--redirected', path: '/login', query: 'redirect_url=%2Fapp' },
  // ── Error states ──
  { name: 'dashboard--error', path: '/app', fx: 'error' },
  { name: 'projects--error', path: '/app/projects', fx: 'error' },
  { name: 'reports--error', path: '/app/reports', fx: 'offline' },
  { name: 'workflow-monitor--error', path: `/app/monitor/${RUNNING}`, fx: 'error' },
  { name: 'runtime-observability--error', path: '/app/runtime', fx: 'error' },
];

const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const report = [];

for (const width of WIDTHS) {
  fs.mkdirSync(path.join(OUT, String(width)), { recursive: true });
  for (const shot of SHOTS) {
    if (only && !only.has(shot.name)) continue;
    if (shot.desktopOnly && width < 1024) continue;

    const context = await browser.newContext({ viewport: { width, height: HEIGHTS[width] }, deviceScaleFactor: 1 });
    // Local harness only. Everything else (fonts CDN, video streams, anything) is refused.
    await context.route('**/*', route => (route.request().url().startsWith(BASE) ? route.continue() : route.abort()));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    page.on('console', m => {
      if (m.type() !== 'error') return;
      const t = m.text();
      // Expected: blocked external assets, and the deliberately failing fixture responses.
      if (/ERR_FAILED|ERR_BLOCKED|Failed to load resource/.test(t)) return;
      errors.push(`console: ${t.slice(0, 300)}`);
    });

    if (shot.noAudits) {
      await page.addInitScript(() => { window.__FX_NO_AUDITS__ = true; });
    }
    const qs = [`fx=${shot.fx ?? 'populated'}`, `fxAuth=${shot.query?.includes('fxAuth') ? 'loading' : 'ready'}`, shot.query].filter(Boolean).join('&');
    await page.goto(`${BASE}${shot.path}?${qs}`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    if (shot.after) { await shot.after(page); await page.waitForTimeout(900); }

    if (shot.scrollThrough) {
      // Trigger scroll-into-view animations, then return to the top.
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < total; y += 500) { await page.mouse.wheel(0, 500); await page.waitForTimeout(120); }
      await page.waitForTimeout(600);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.mouse.wheel(0, -100000);
      await page.waitForTimeout(1500);
    }

    const layout = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const scroller = document.querySelector('main > div.overflow-auto');
      const offenders = [];
      for (const el of document.querySelectorAll('body *')) {
        if (el.closest('[data-fixture-badge]')) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right <= vw + 1 && r.left >= -1) continue;
        // Ignore anything clipped by an ancestor (decorative glows, off-canvas drawer, carousels).
        let clipped = false;
        for (let a = el.parentElement; a; a = a.parentElement) {
          const s = getComputedStyle(a);
          if (s.overflowX !== 'visible' || s.position === 'fixed') { clipped = a !== document.body && a !== document.documentElement ? true : clipped; if (clipped) break; }
        }
        if (getComputedStyle(el).position === 'fixed') clipped = true;
        if (!clipped) offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} [${Math.round(r.left)}..${Math.round(r.right)}]`);
      }
      return {
        viewport: vw,
        documentOverflowPx: Math.max(0, document.documentElement.scrollWidth - vw),
        contentOverflowPx: scroller ? Math.max(0, scroller.scrollWidth - scroller.clientWidth) : 0,
        offenders: offenders.slice(0, 8),
      };
    });

    // The app shell scrolls an inner container, so a full-page capture would stop
    // at the fold. After measuring, let that container grow for the capture only
    // (viewport width and vh units are untouched). The console is a fixed-height
    // app-style view and is captured as-is.
    if (!shot.path.startsWith('/app/console')) {
      await page.addStyleTag({ content: `
        div.flex.h-screen.overflow-hidden { height: auto !important; min-height: 100vh; overflow: visible !important; }
        div.flex.h-screen.overflow-hidden > main, main > div.overflow-auto { overflow: visible !important; }
        /* overflow:hidden gave <main> an implicit min-width of 0; keep that so truncation still applies */
        div.flex.h-screen.overflow-hidden > main { min-width: 0 !important; }
        main > div.overflow-auto { min-width: 0 !important; overflow-x: clip !important; }
        div.flex.h-screen.overflow-hidden > aside { align-self: stretch; }
      ` });
      await page.waitForTimeout(300);
    }

    const file = path.join(OUT, String(width), `${shot.name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    report.push({ name: shot.name, width, ...layout, errors });
    const flag = layout.documentOverflowPx || layout.contentOverflowPx || layout.offenders.length || errors.length ? '  <-- CHECK' : '';
    console.log(`${String(width).padStart(4)}  ${shot.name}${flag}`);
    await context.close();
  }
}

await browser.close();
if (!only) fs.writeFileSync(path.join(OUT, '..', 'layout-report.json'), JSON.stringify(report, null, 2) + '\n');
const bad = report.filter(r => r.documentOverflowPx || r.contentOverflowPx || r.offenders.length || r.errors.length);
console.log(`\n${report.length} screenshots, ${bad.length} flagged.`);
for (const b of bad) console.log(JSON.stringify(b));
