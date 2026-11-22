# V1 finish — verification record

Branch `fricta/v1-finish` (from `fricta/v1-frontend-completion` @ `489e803`).
Run date: 2026-11-22, in a sandboxed cloud container with local PostgreSQL 16
and Redis 7. **No live LLM was called.** No paid model or service was used, and
no secret is in code, logs or commits.

Legend: **Verified** means exercised here and observed to work.
**Stub-verified** means exercised for real, except that the LLM was the local
stub. **Not verified** means not exercised; the reason is given.

---

## 1. Provider config: free models only by default

| Item | Status |
|---|---|
| Default `AGENT_MODEL` and new `AGENT_VISION_MODEL` = `google/gemma-4-31b-it:free` | Verified (unit tests, plus E2E launch reports `model=google/gemma-4-31b-it:free`) |
| Non-free id → `PaidModelNotAllowedError` at startup, in the factory and in direct provider/vision construction | Verified (unit tests) |
| Only `ALLOW_PAID_MODELS=true` (exact) opts in | Verified (unit tests) |
| `AGENT_BASE_URL` (+ optional `AGENT_API_KEY`) used by the planner **and** the vision analyzer | Verified (unit test against the stub; E2E runs entirely through it) |
| `google/gemma-4-31b-it:free` really is free and accepts images on OpenRouter today | **Not verified from here.** openrouter.ai is blocked by this sandbox's egress proxy. The choice is based on OpenRouter's public model page as indexed by web search on 2026-11-22: text+image+video input, 262k context, $0, rate-limited, single provider (Google AI Studio). Re-check at <https://openrouter.ai/models?max_price=0> before relying on it. |

The free rule is a naming rule (`:free` suffix or the `openrouter/free`
router). It cannot prove that an arbitrary `AGENT_BASE_URL` endpoint is free,
so it applies there too (see `docs/SETUP.md`).

## 2. Audit pipeline end to end, against a local LLM stub

`apps/backend/e2e/stub-llm-server.mjs` is a deterministic OpenAI-compatible
**stub**. It does no inference; replies are scripted from the prompt.
`apps/backend/e2e/run-audit-e2e.mjs` boots the real backend
(`apps/backend/src/index.ts` via tsx) with `AGENT_BASE_URL` pointing at the
stub, then drives the product over HTTP with real Clerk JWT verification. The
Clerk part uses networkless mode: `CLERK_JWT_KEY` is a throwaway PEM generated
per run, and tokens are signed with its private key. No middleware is mocked.

Run: `npm run test:e2e:stub --workspace=@fricta/backend`
Result: **42/42 checks passed.** Full list: `e2e-stub-results.json`.

| Step | Against the stub | Still needs a real LLM to trust |
|---|---|---|
| Launch (`POST /api/agent/workflow/run`) | Stub-verified | — |
| BullMQ worker picks up job, Playwright browses a local target site | Stub-verified (RUNNING → COMPLETED, 3 steps; dead-end scenario → FAILED, 6 steps) | Whether a free model returns valid action JSON reliably, within the 150-token cap and the step timeout |
| Status / thoughts / actions persisted and readable | Stub-verified | Quality of thoughts |
| SSE (`/api/realtime/{replay,timeline,orchestration}`) connects + hydrates, rejects other users | Stub-verified (`system.connected`, `system.hydrated`) | Live event cadence during a long real run was not observed |
| Report auto-generated on job completion, listed, executive summary, timeline | Stub-verified | Meaningfulness of scores |
| Findings: visual heuristics + vision call, UX analysis, recommendations, orchestrator, agent findings, shared memory, historical analysis | Stub-verified (vision request reached the stub with a real screenshot; 9 visual findings; dead-end run yields a UX friction finding) | **Vision accuracy:** the stub returns a fixed `[STUB]` box. A real image-capable free model has never been called. |
| Replay: 3 screenshots + 3 timeline events, raw image served only with auth (401 anon / 200 owner, real WebP) | Stub-verified | — |
| Exports: JSON, PDF (real `%PDF-`, ~85 KB) | Stub-verified | — |
| Cross-user isolation on 13 session-scoped routes + SSE + historical | Verified | — |

Not exercised: Markdown / PM-summary exports (client-side), the
`/api/reports/exports*` and sharing endpoints, real OpenRouter
rate-limit/402/404 handling, multi-worker concurrency.

### Real bugs this exposed (all fixed on this branch)
1. `page.evaluate` threw `__name is not defined` under tsx (`npm run dev`), so screenshot metadata was always empty. Fixed with a shim per browser context.
2. The final step's screenshot and late replay links were lost, because the context closed and the report generated before background captures finished. The loop now drains captures (bounded to 15 s).
3. PDF export always failed wherever Playwright's managed headless-shell wasn't installed: it duplicated launch code and ignored the browser path.
4. **Security:** `/api/ux/{findings,cognitive,recommendations,analyze}/:sessionId` had no ownership check, and a failed foreign `analyze` flipped the victim's session to FAILED.
5. **Security:** `/api/memory/:sessionId/*` guard was registered with `use('*')`, where Hono has no params, so it never ran (foreign user got HTTP 200).
6. `POST /api/historical/analyze/:projectId` always returned 400 (same Hono pitfall, failing closed).
7. Replay/findings `<img>` tags requested `/api/workflows/screenshots/raw/...` without a token (an `<img>` can't send one), so every frame 401'd for real users. The fixtures hid this with a placeholder. Fixed with `AuthedImg`.
8. Cognitive signals duplicated: the report tab triggers analysis on mount, and concurrent runs interleaved a non-atomic delete/insert. Now done in a transaction under a per-session advisory lock.
9. The friction heatmap counted cognitive signals as steps (a 3-step audit showed 10 cells). It now uses the session's step count.
10. The step-friction strip overflowed its panel by 53 px at exactly 768 px (`md:flex-nowrap`).
11. `npm ci` ran `npx playwright install` via a `postinstall` and failed wherever the browser CDN is blocked (this also affected the frontend Docker build).
12. Clerk middleware ignored `CLERK_JWT_KEY` (`@hono/clerk-auth` drops it when reading env itself).

## 3. Landing/auth video and Clerk fallback
- **Mux video:** the auth-shell background streamed `stream.mux.com/…m3u8` (reported 403). This sandbox can't reach Mux at all, so the 403 itself was not reproduced here. Replaced with the bundled, previously unused `Video_Fricta.mp4`, and `hls.js` removed. The landing page already used a bundled MP4. **Verified:** the video renders as the auth background (local probe screenshot).
- **Clerk fallback:** the hardcoded `liked-mouse-95` key is gone. The key comes only from `VITE_CLERK_PUBLISHABLE_KEY`; missing or malformed → "Sign-in is not configured" screen. **Verified** by typecheck/build and by the probe below loading the safe-terrier-54 instance from env. The real safe-terrier-54 key is not in this environment; it was derived from the public instance host for the probe and is not committed.

## 4. Signup behind Cloudflare Turnstile: diagnosis
Two bounded attempts against the real `/register` page (real Clerk SDK,
headless Chromium), plus one `curl` per host:

| Host | Result in this sandbox |
|---|---|
| `safe-terrier-54.clerk.accounts.dev` (Clerk frontend API + clerk-js) | `403 Forbidden (agent proxy: no rule or network setting allows this host)` |
| `challenges.cloudflare.com` (Turnstile script + challenge iframe) | same 403 from the egress proxy |

Browser result: `ERR_TUNNEL_CONNECTION_FAILED`, then Clerk
`failed_to_load_clerk_js_timeout`. The sign-up card never rendered, so
Turnstile was never reached in this session.

**Cause:** the sandbox's egress allowlist. Clerk's bot protection on sign-up
needs the browser to load Turnstile from `challenges.cloudflare.com` and to
complete it. Where that host is blocked, the CAPTCHA can't produce a token and
Clerk rejects the sign-up. That fits an earlier sandbox where Clerk itself
loaded (login worked) but sign-up failed. That earlier environment's allowlist
was not available to inspect, so that part is inference. A second, unverified
factor: Turnstile may also challenge or refuse automated headless browsers
even when reachable.

CAPTCHA was **not** disabled. Options that keep it on:
1. Create the test account once in a normal browser, then use sign-**in** (no Turnstile on sign-in) for automated checks.
2. For automated E2E, use Clerk Testing Tokens (`@clerk/testing`; free on development instances, requires `CLERK_SECRET_KEY`). They are Clerk's sanctioned bypass of bot detection for tests only.
3. Allow `*.clerk.accounts.dev` and `challenges.cloudflare.com` in the environment's network policy (still subject to the headless caveat).

Side fix: when clerk-js can't load, the auth page used to fall through to an
empty background. It now shows a "Sign-in is unavailable right now" card with
the likely cause and a reload button. Verified in the second probe attempt.

## 5. Build, typecheck, lint, tests

| Gate | Result |
|---|---|
| `npm ci` | passes (after removing the browser-download postinstall) |
| `npx turbo run build` (45 packages incl. frontend) | **pass** |
| `npm run typecheck` (backend + frontend) | **pass** |
| `npm run lint` | **0 errors**, 2,568 warnings (2,567 before this branch; the +1 is a `tx: any` in the UX coordinator) |
| Backend unit (`vitest run`) | **67/67 pass** (10 new for the LLM policy, 4 new 403 cases) |
| Backend integration (`vitest --config vitest.integration.config.ts`, real `fricta_test` DB) | **31/31 pass** |
| `npm run test:security` | **8/8 + 19/19 pass** |
| E2E vs stub (`test:e2e:stub`) | **42/42 pass** |
| Frontend unit tests | none exist |

## 6. Screenshots (390 / 768 / 1440)
`screenshots/<width>/`: `landing`, `dashboard`, `new-audit`, `audit-monitor`,
`report` (UX Findings tab), `report-replay` (Timeline Replay tab),
`report-dead-end`. 21 images; `layout-report.json` has per-shot overflow
measurements.

How they were made: the dev-only harness in **live-API mode**
(`FIXTURES_API_TARGET`) proxied `/api` to the real backend left running by
`run-audit-e2e.mjs --keep-alive`. All data on these pages comes from Postgres,
written by the stub-driven audits above, and the replay frames are the agent's
real screenshots of the local target site. **Clerk is mocked** (no real session
is possible here; see §4), so the user shows as "Fixture User". The amber badge
on every shot says "Live API · stub LLM · Clerk mocked".

Inspection: automated overflow check, 0 flagged on the final run. Visual
review of the replay (1440, 390), report (768), dashboard, new audit and
monitor (390) found no clipping, except the two defects already listed (768
heatmap overflow, broken replay images), both fixed before the final run. On
phones the Timeline Replay tab intentionally shows a "best on desktop" notice.

## Remaining gaps (honest list)
- **No live LLM call has ever been made.** Unknowns: free-model JSON reliability, latency against the 150-token cap and step timeouts, OpenRouter free-tier rate limits, vision quality, and whether `google/gemma-4-31b-it:free` is still listed when the key arrives.
- **Real-Clerk sign-up not verified** (blocked hosts; see §4). Real sign-in was verified in an earlier session, not in this one.
- Mux 403 not reproduced here (Mux unreachable), only removed.
- The report page shows two different scores (grade "A 100/100" from report scores vs "Overall Score 89" from the persona simulation). It's a product-copy/scoring inconsistency, not fixed.
- The dead-end scenario ends `FAILED`, not `LOOP_DETECTED`: the action validator rejects the stub's third identical scroll. That is correct validator behaviour given the stub's script, but it means the `dead_end` terminal path was not exercised.
- BullMQ retries a job up to 3× only when `runWorkflow` throws (e.g. provider setup failure); a failed agent loop is not retried. Not changed.
- Lint warnings (2.5k, pre-existing) not addressed.
