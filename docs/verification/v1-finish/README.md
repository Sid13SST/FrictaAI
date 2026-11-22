# V1 finish — verification record

Branch `fricta/v1-finish` (from `fricta/v1-frontend-completion` @ `489e803`).
Run dates: 2026-11-22 (round 1 and round 2, same day), in a sandboxed cloud container with local PostgreSQL 16
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
| `google/gemma-4-31b-it:free` really is free and accepts images on OpenRouter today | **Not verified from this sandbox** (openrouter.ai is blocked by its egress proxy). Round 1 picked it from OpenRouter's public model page as indexed by web search: text+image+video input, 262k context, $0, rate-limited, single provider (Google AI Studio). Round 2: the project owner reports it was confirmed free and image-capable from OpenRouter's public models API on 2026-11-22; the default is unchanged. Free variants rotate, so re-check with `npm run check:models --workspace=@fricta/backend` (public API, no key, no cost). |
| `check:models` re-check script | Logic verified offline against a **synthetic** saved response (`OPENROUTER_MODELS_FILE`): exit 0 when listed at $0 with image input, 1 when delisted or the vision model lacks image input. The live run from here exits 2 (unreachable), as expected. Not yet run against the real API. |
| Startup note | Verified: the backend logs the active agent/vision model and endpoint, plus the re-check hint, at boot. |

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
Result: round 1 **42/42**; round 2 **75/75 checks passed** (the 42 plus 33 new
ones). Full list from the final run: `e2e-stub-results.json`.

| Step | Against the stub | Still needs a real LLM to trust |
|---|---|---|
| Launch (`POST /api/agent/workflow/run`) | Stub-verified | — |
| BullMQ worker picks up job, Playwright browses a local target site | Stub-verified (RUNNING → COMPLETED, 3 steps; dead-end scenario → FAILED: three scrolls succeed, then the validator rejects a fourth identical scroll and the planner's retry repeats it. Round 1 counted 6 steps for the same path, round 2's final run 3) | Whether a free model returns valid action JSON reliably, within the 150-token cap and the step timeout |
| Status / thoughts / actions persisted and readable | Stub-verified | Quality of thoughts |
| SSE (`/api/realtime/{replay,timeline,orchestration}`) connects + hydrates, rejects other users | Stub-verified (`system.connected`, `system.hydrated`) | Live event cadence during a long real run was not observed |
| Report auto-generated on job completion, listed, executive summary, timeline | Stub-verified. Round 2: on completion the worker first runs heuristic visual analysis and UX analysis, so findings exist when the grade is computed | Meaningfulness of scores |
| One audit score (report = executive grade = reports list = Markdown = PM summary) | Stub-verified (round 2): happy path 90/A, dead-end 55/F, no-exit 55/F; list matches right after analysis | The happy path's 90 includes −24 for visual findings, part of which are the **stub's** scripted `[STUB]` vision boxes. A real model will produce different findings and so different scores |
| Findings: visual heuristics + vision call, UX analysis, recommendations, orchestrator, agent findings, shared memory, historical analysis | Stub-verified (vision request reached the stub with a real screenshot; 9 visual findings; dead-end run yields a UX friction finding) | **Vision accuracy:** the stub returns a fixed `[STUB]` box. A real image-capable free model has never been called. |
| Replay: 3 screenshots + 3 timeline events, raw image served only with auth (401 anon / 200 owner, real WebP) | Stub-verified | — |
| Exports: JSON, PDF (real `%PDF-`, ~85 KB) | Stub-verified | — |
| Markdown + PM-summary exports (server-generated in `GET /api/reports/:id/export`) | Stub-verified (round 2): both contain the same score and grade as the report; Markdown includes the goal | Content quality |
| Executive report → `/api/reports/exports*`: queue PDF, list, complete, download | Stub-verified (round 2): real `%PDF-` download, ~62 KB; `SNAPSHOT` (not implemented) ends FAILED with "not yet implemented"; other users get 403 on list, create and download | Only PDF is implemented; PRESENTATION / SNAPSHOT / CSV / ZIP are not |
| Sharing: create, list, anonymous open (`GET /api/shared/:token`), unknown / revoked / expired / max-uses tokens, cross-user create, list and revoke | Verified (round 2) | — |
| `dead_end` terminal signal → `LOOP_DETECTED` | Stub-verified (round 2): on a page with no links, buttons or inputs the stub sends `dead_end`; the run ends `LOOP_DETECTED` (actions `scroll`, `wait:dead_end`) and is graded F | Whether a real model emits `dead_end` when appropriate |
| Concurrency: two audits launched at once, two backend/worker processes on the same Postgres + Redis | Stub-verified (round 2): each job ran on exactly one worker (one per process in the final run), both COMPLETED, screenshots and actions stayed on each audit's own site (`/alpha` vs `/beta`), exactly one report each, queue empty afterwards | Only 2 audits × 2 workers, once per run. Not a load test, not worker crash/stall recovery |
| Cross-user isolation on 13 session-scoped routes + SSE + historical | Verified | — |

Round 1 listed as not exercised: Markdown / PM-summary exports (wrongly
described as client-side; they are server-generated), the
`/api/reports/exports*` and sharing endpoints, and multi-worker concurrency.
All are exercised in round 2 (rows above). Still not exercised: real
OpenRouter rate-limit/402/404 handling, export templates / evidence /
distribution endpoints (now reachable, see bug 14, but not driven), and load
beyond two concurrent audits.

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

Round 2:

13. **Grade ignored outcome and findings.** Every pillar started at 100 and only action-log signals were subtracted, and the grade was computed before any visual/UX analysis ran. So a failed dead-end audit with visual warnings was "A 100/100". Now `scoreAudit()` (ux-engine) is the single source of truth: behavioural pillars, minus UX findings (smoothness, capped −40), minus visual defect findings (clarity, capped −25; `vision_summary` commentary ignored), and capped at 55 (grade F) when the goal was not reached. The formula has no hard-coded 100 once findings exist (unit-tested).
14. **Route shadowing.** `GET /api/reports/:id` was registered before the static `GET /exports`, `/sharing`, `/templates`, `/evidence` and `/distribution`, so those handlers never ran (Hono answered 404 from `requireWorkflowOwner('exports')`; reproduced with a minimal Hono app). Session-scoped routes now register last.
15. **Share links couldn't be opened anonymously.** The only resolver required auth and returned the creator's user id and the recipient email. The new public `GET /api/shared/:token` returns just the shared report and its expiry.
16. **Persona panel invented a second score.** "Overall Score 89" came from hard-coded per-persona constants. It now projects the audit score: Standard is the audit score itself; other personas subtract only findings tagged for them (frontend unit-tested).
17. **Reports list showed stale scores.** The orchestrator ("Run UX Diagnostics") and report generation wrote the raw behavioural score back to `UXReport.score`, so the list said 100 while the report said 90. All writers now store the audit score, and visual/UX analysis refreshes it.

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
| `npm run lint` | **0 errors**. Warnings: 2,567 before this branch → 2,568 after round 1 → 2,583 after round 2 (+15 `any` casts in new backend code: Prisma tx and coordinator wiring) |
| Backend unit (`vitest run`) | Round 1 **67/67**; round 2 **76/76** (7 new `scoreAudit` tests, 2 new grade tests in `report.test.ts`) |
| Backend integration (`vitest --config vitest.integration.config.ts`, real `fricta_test` DB) | **31/31 pass** (both rounds) |
| `npm run test:security` | **8/8 + 19/19 pass** (both rounds) |
| E2E vs stub (`test:e2e:stub`) | Round 1 **42/42**; round 2 **75/75** |
| Frontend unit (`npm test -w @fricta/frontend`, new in round 2) | **4/4 pass** (persona projection) |

## 6. Screenshots (390 / 768 / 1440)
`screenshots/<width>/`: `landing`, `dashboard`, `new-audit`, `audit-monitor`,
`report` (UX Findings tab), `report-replay` (Timeline Replay tab),
`report-dead-end`, and (round 2) `report-dead-end-persona` (Power
Administrator selected). 24 images, all re-shot in round 2 from a fresh run;
`layout-report.json` has per-shot overflow measurements.

How they were made: the dev-only harness in **live-API mode**
(`FIXTURES_API_TARGET`) proxied `/api` to the real backend left running by
`run-audit-e2e.mjs --keep-alive`. All data on these pages comes from Postgres,
written by the stub-driven audits above, and the replay frames are the agent's
real screenshots of the local target site. **Clerk is mocked** (no real session
is possible here; see §4), so the user shows as "Fixture User". The amber badge
on every shot says "Live API · stub LLM · Clerk mocked".

Round 2 inspection: automated overflow check, 0 of 24 flagged. Visual review
of the report pages at 1440, 768 and 390: the dead-end report shows grade F
55/100 with "Audit score 55, same score as the report grade" beside it, and the
persona shot shows "Projected for persona 51" (55 − 4). One cramped layout was
found and fixed before the final shots: the big heading wrapped to three lines
with its caption squeezed into a narrow column at 1440. The caption is now
full width under the gauge.

Round 1 inspection: automated overflow check, 0 flagged on the final run. Visual
review of the replay (1440, 390), report (768), dashboard, new audit and
monitor (390) found no clipping, except the two defects already listed (768
heatmap overflow, broken replay images), both fixed before the final run. On
phones the Timeline Replay tab intentionally shows a "best on desktop" notice.

## Remaining gaps (honest list)
- **No live LLM call has ever been made.** Unknowns: free-model JSON reliability, latency against the 150-token cap and step timeouts, OpenRouter free-tier rate limits, vision quality, and whether `google/gemma-4-31b-it:free` is still listed when the key arrives.
- **Real-Clerk sign-up not verified** (blocked hosts; see §4). Real sign-in was verified in an earlier session, not in this one.
- Mux 403 not reproduced here (Mux unreachable), only removed.
- ~~The report page shows two different scores~~. **Fixed in round 2** (bugs 13, 16, 17). Caveat: the penalty weights (−5/−10/−15 per UX finding, −1…−8 per visual finding, F-cap 55) are product judgement, not calibrated against real users or a real model's findings.
- ~~The `dead_end` terminal path was not exercised~~. **Exercised in round 2** via the no-exit page (`LOOP_DETECTED`). The original dead-end scenario still ends `FAILED` through the validator-rejection path, which is also exercised.
- Concurrency covers 2 audits × 2 workers in one run. Not covered: worker crash mid-job, BullMQ stalled-job recovery, more than 2 parallel browsers, multiple Node processes hitting the per-process in-memory fallbacks (`memoryDb`) when the DB is down.
- Export formats other than PDF are not implemented (they fail honestly).
- BullMQ retries a job up to 3× only when `runWorkflow` throws (e.g. provider setup failure); a failed agent loop is not retried. Not changed.
- Lint warnings (2.5k, pre-existing) not addressed.
