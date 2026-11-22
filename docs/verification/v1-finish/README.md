# V1 finish — verification record

Branch `fricta/v1-finish` (from `fricta/v1-frontend-completion` @ `489e803`).
Run dates: 2026-11-22 (rounds 1–4, same day), in a sandboxed cloud container with local PostgreSQL 16
and Redis 7. **No live LLM was called from inside this sandbox** (openrouter.ai
is blocked here). The only real-provider evidence is the reviewer's own run
outside the sandbox (§0). No paid model or service was used, and no secret is in
code, logs or commits.

Legend: **Verified** means exercised here and observed to work.
**Stub-verified** means exercised for real, except that the LLM was the local
stub. **Not verified** means not exercised; the reason is given.

---

## 0. Real OpenRouter free-pool run (reviewer, outside this sandbox)

Run by the reviewer against branch head `150bc79`, real OpenRouter free pool.
Reported results, not reproduced here:

| Model | Result |
|---|---|
| `google/gemma-4-31b-it:free` (agent + vision) | **FAIL.** The audit FAILED at step 2: all three planner attempts (1 s / 2 s backoff) got HTTP 429 (upstream rate limit). Vision calls also got 429. |
| `openrouter/free` | **PASS** for the agent: audit COMPLETED in 3 steps (click "Pricing", `goal_complete`). **Partial** for vision: some calls returned 429 or an empty response. |

Round 3 responded to this (bugs 18–22 in §2).

**Reviewer re-run on round-3 head `6cde80e`, real OpenRouter free pool
(reported by the reviewer, not reproduced here):**

| Area | Result |
|---|---|
| Agent retry + fallback | **PASS (real provider).** `google/gemma-4-31b-it:free` got HTTP 429 ×5, then the call fell back to `openrouter/free` and the real audit **COMPLETED**. |
| Vision | **FAIL ×4 in one run:** one 429, one empty response, and **twice truncated model JSON** ("Unterminated string in JSON at position ~1260"). |

Round 4 responds to the vision failures and a retry-compliance issue (bugs
23–29 below). **The round-4 code has not been run against the real provider.**
It is verified with fake-response unit tests and the local stub only.

Separate stub-only evidence: the reviewer also ran the round-3 stub harness
independently on `6cde80e`: 83/83 PASS in about 45 s. That is stub evidence,
not real-provider proof.

**Reviewer evidence on round-4 head `f8c4a7d` (reported, not reproduced here):**

| Area | Result |
|---|---|
| Stub E2E (independent) | **84/85.** Only the dead-end "visual findings at report time" check failed (0 found). Cause and fix: bug 30. |
| Real short audit via `openrouter/free` (real key, Postgres, Redis, Chromium) | **COMPLETED** in 2 steps (click Pricing, `goal_complete`); 27/27 flow / auth / SSE / replay / report / PDF checks. **But** the first readable report showed scores 100 with `visualCoverage` `not_analyzed`, 2 screenshots and no findings, while the completion hook's analysis was still running: a provisional score presented as final (bug 30). The script stopped right after report/PDF/replay, so background vision was not awaited; this is not a vision failure. |
| Compiled `VisualAIAnalyzer` called directly on a real report screenshot via `openrouter/free` | **status ok**, routed to `particle-ai/particle-1:free`, 5 boxes, 1,043 characters, parsed cleanly, no truncation. This proves the round-4 vision path against a live provider, separately from full-audit finalization. Provider key usage 0; no paid calls. |

Not yet real-provider tested: a full audit whose post-run vision analysis is
awaited to completion, and the round-5 pending-state fix (stub-verified only).

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
Result: round 1 **42/42**; round 2 **75/75**; round 3 **83/83 checks passed**
(8 new rate-limit / evidence / coverage checks). Full list from the final run:
`e2e-stub-results.json`.

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
| Rate limits (round 3): planner always 429 | Stub-verified: each planner call attempted 5× (15 stub 429s over 3 steps, `Retry-After: 0` honoured), run FAILED with 0 actions, report not scored (below) | Real 429 bursts, real `Retry-After` values, and the `openrouter/free` fallback (the stub is not OpenRouter, so fallback is covered only by fake-fetch unit tests) |
| Insufficient evidence (round 3): FAILED with 0 actions | Stub-verified: report `scores.overallScore = null`, `evidence.status = insufficient`, executive grade `N/A`, reports list score `null`, Markdown "Not scored: insufficient evidence", PM summary "NOT SCORED", PDF renders | — |
| Vision 429 / empty (round 3) | Stub-verified: 5 attempts per screenshot, `vision_unavailable` markers with the reason, `visualCoverage.complete = false` (status `failed`) in the report, executive summary, Markdown and PM summary; no vision summary presented as a clean result; coverage returns to `full` when the stub answers again | Real-model vision quality and real empty-response rates |
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

Round 3:

18. **Rate limits killed real audits** (the reviewer's run, §0): 3 attempts at 1 s / 2 s, no server-hint handling, no fallback, empty vision responses not retried, and vision gave up after one attempt with an 8 s timeout. Now a shared policy: honour `Retry-After` / `X-RateLimit-Reset`, else full-jitter exponential backoff, 5 attempts, ≤20 s per wait, 120 s budget. Then one fallback to `openrouter/free` on 429, empty content, 404 or a paid model's 402: never a paid id, OpenRouter only. Step timeout raised 60 s → 180 s so the budget fits.
19. **Failed vision looked like a successful pass.** It was stored as a `vision_summary` ("AI Visual Analysis Fallback") with `aiUsed = true` and cached, so it was never retried. Now it's a `vision_unavailable` info marker, not cached, not counted as a defect.
20. **A 0-action FAILED audit was graded 55/F** ("behavioural 100"). It's now unscored, with null scores and an "insufficient evidence" label in the report, exports, PDF, reports list and UI. `UXReport.score` is nullable (migration `20261122140000_uxreport_score_nullable`).
21. **The reports list used different grade bands** (A ≥ 80) from the report (A ≥ 90). Unified.
22. **The stored report summary contradicted the grade** ("Workflow completed with 0 actions … Overall UX is excellent"). It now states only what was recorded.

Round 4:

23. **Vision JSON cut off (root cause).** `max_tokens` was 500 while the prompt asked for a "detailed" explanation and an unbounded box list in a code fence; answers hit the limit mid-string at about 1,260 characters. Now: `max_tokens` 1200 (`AGENT_VISION_MAX_TOKENS`); the prompt caps output (explanation ≤400 chars, feedback ≤200, ≤5 boxes, labels ≤60, JSON only), and parsing enforces the same limits. `finish_reason` `length` / `MAX_TOKENS` marks the answer truncated.
24. **Bounded JSON repair that never completes a cut value.** It cuts back to the last element the model actually finished (≤400 candidates; input ≤50k chars) and closes the open brackets. A cut string or number is dropped with its field, never closed artificially. Boxes missing any of x/y/w/h/label are discarded. A truncated or unparseable answer gets **one** retry with stricter limits. A complete retry wins; otherwise the repaired partial is kept but flagged truncated; unparseable twice → `failed`.
25. **Coverage with truncation.** A repaired or `finish_reason=length` answer is never full coverage: `visualCoverage` becomes `partial` (`visionTruncated` counted) with a note. Total failures keep `vision_unavailable` → incomplete (round 3).
26. **Retry compliance.** Round 3 clamped every wait to 20 s, so `Retry-After: 60` was retried after 20 s, inside the provider's cooldown. Now server-requested waits are honoured in full; only our own jittered backoff is capped at 20 s. If the server asks for longer than the call's remaining 120 s budget, the call stops with a "rate-limit cooldown" reason and does **not** fall back to `openrouter/free` (that would evade the same account-wide cooldown).
27. **Zero-evidence reports showed fake diagnostics.** With 0 recorded actions the UX engines still emitted default values (cognitive overload 10%, decision fatigue 27%…). There was also a heatmap "STEP 1 15% Good", a green "No friction findings detected", persona projections, "Discoverability risk: LOW", and persona tables in the exports. Now no behavioural signals or findings are produced or reported without actions. Every report panel, the Persona Simulations / UX Insights tabs, the reports-list card, and Markdown / PM / PDF / JSON (an explicit `availability` block) say "Unavailable: no evidence"; risk levels are UNKNOWN. Visual observations of recorded screenshots are kept and labelled as such.
28. **The production backend could never start.** `node apps/backend/dist/index.js` (the Docker `CMD`) failed: ESM output without file extensions (`ERR_MODULE_NOT_FOUND`) and deep imports of TypeScript source (`@fricta/optimization-intelligence/src/*`). Dev hid it via `tsx`. Backend and packages now compile to CommonJS; the deep imports are gone.
30. **Provisional reports looked final** (round 5). The session reaches a terminal status before the worker's completion hook runs visual/UX analysis, and `GET /api/reports/:id` auto-generates a report on first read. In that window the report showed a final-looking score (100) with `not_analyzed` coverage and no findings. That's what the reviewer's real run hit, and the cause of the reviewer's 84/85 stub run (it did not reproduce on this faster machine until the analyzer was slowed). Now a Redis marker (`fricta:analysis-pending:<id>`, TTL 30 min) is set when the worker starts a job and cleared when finalization ends. While it exists (or the session is still running) the report has `analysis.state = pending`, every score is null and nothing is persisted as final; executive / exports / PDF / reports list / UI say "analysis in progress". The page auto-refreshes. The E2E reproduces the window with a slow stub analyzer and waits (bounded, 90 s) for readiness before asserting findings.
29. **Docker compose could not reach its own database.** `DATABASE_URL` / `REDIS_URL` were taken from `.env` (localhost for dev = the backend container itself). Also: Prisma OpenSSL detection on `node:20-slim`, ports exposed on all interfaces. See §7.

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
| `npm run lint` | **0 errors**. Warnings: 2,567 before this branch → 2,568 (round 1) → 2,583 (round 2) → 2,593 (round 3) → 2,604 (round 4) → 2,609 (round 5) |
| Backend unit (`vitest run`) | Round 1 **67/67**; round 2 **76/76**; round 3 **106/106**; round 4 **137/137**; round 5 **140/140** (pending vs ready, running session, list) (truncated JSON / length / empty fake responses, Retry-After 60, far-future reset, budget exhaustion, zero-evidence exports) |
| Backend integration (`vitest --config vitest.integration.config.ts`, real `fricta_test` DB) | **31/31 pass** (all rounds) |
| `npm run test:security` | **8/8 + 19/19 pass** (all rounds) |
| E2E vs stub (`test:e2e:stub`) | Round 1 **42/42**; round 2 **75/75**; round 3 **83/83**; round 4 **85/85** in 33 s here (reviewer: 84/85, bug 30); round 5 **87/87** on two consecutive runs (36 s, 34 s), including the slow-analyzer pending-report reproduction |
| Frontend unit (`npm test -w @fricta/frontend`, new in round 2) | Round 2 **4/4**; round 3 **7/7**; round 4 **8/8** (no-evidence note) |
| Compiled backend with plain `node` (round 4) | **pass**: boots, health 200, auth 401, migrations validated (node 22 host; node 24 in the Playwright runtime image) |

## 6. Screenshots (390 / 768 / 1440)
`screenshots/<width>/`: `landing`, `dashboard`, `new-audit`, `audit-monitor`,
`report` (UX Findings tab), `report-replay` (Timeline Replay tab),
`report-dead-end`, and (round 2) `report-dead-end-persona` (Power
Administrator selected), and (round 3) `reports` (the reports list) and
`report-insufficient-evidence`. 30 images, all re-shot in round 4 from a fresh
run; `layout-report.json` has per-shot overflow measurements.

How they were made: the dev-only harness in **live-API mode**
(`FIXTURES_API_TARGET`) proxied `/api` to the real backend left running by
`run-audit-e2e.mjs --keep-alive`. All data on these pages comes from Postgres,
written by the stub-driven audits above, and the replay frames are the agent's
real screenshots of the local target site. **Clerk is mocked** (no real session
is possible here; see §4), so the user shows as "Fixture User". The amber badge
on every shot says "Live API · stub LLM · Clerk mocked".

Round 5 (pending state): `screenshots/1440/report-analysis-pending.png` and
`screenshots/390/report-analysis-pending.png` show the real current UI for a
report whose post-run analysis is still running. A fresh audit was run with a
slow stub analyzer (`STUB_SLOW_MS=10000`), and each shot was taken while the
backend returned `analysis.state = pending`, score null, grade N/A, coverage
`not_analyzed`; for the 390 shot this was confirmed immediately before and
after the capture. An earlier 390 attempt that landed after the report
became ready (A 90) was discarded. Both show the "Analysis in progress"
banner, a "…" grade, n/a pillars and the in-progress panel on the UX Findings
tab. No clipping or horizontal overflow (automated check 0 flagged; visual
review at both widths).

Round 4 inspection: automated overflow check, 0 of 30 flagged. Visual review
of `report-insufficient-evidence` at 1440 and 390: persona projections,
cognitive load, friction heatmap (legend hidden), heuristic findings and
recommendations each show a neutral "Unavailable: no evidence" note. There are
no percentages, no "Good" and no green check. Grade N/A and the amber banner
are unchanged, and nothing clips at 390. The `reports` list card (390) shows
"Overall UX: Unavailable: no evidence" and "Findings unavailable: no
evidence". 28 of 30 PNGs changed; only `report-insufficient-evidence` and
`reports` (all widths) show new behaviour, while the others changed because a
fresh run has new session ids, timestamps and list contents.

Round 3 inspection: automated overflow check, 0 of 30 flagged. Visual review
of the insufficient-evidence report (1440) shows the amber "Not scored:
insufficient evidence" banner, grade N/A, "Not scored", n/a pillars, and the
persona panel with no projection. The reports list (1440 and 390) shows the
unscored audit as a dashed ring with one "Not scored" badge and an n/a bar.
Two defects were found and fixed before the final shots: a duplicated "NOT
SCORED" badge, and a summary reading "Overall UX is excellent" for the failed
0-action run.

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

## 7. Local run with Docker (round 4)

Route: `docker-compose.prod.yml` + the two Dockerfiles, on the user's own
computer. No hosting, accounts or domains beyond a free Clerk app and a free
OpenRouter key. Docs: `docs/LOCAL_RUN.md`; preflight: `scripts/local-preflight.sh`.

| Check | Status |
|---|---|
| Preflight script | Verified here: all checks pass/fail as intended; it never prints a value |
| Backend runtime image `mcr.microsoft.com/playwright:v1.60.0-jammy` running the compiled backend (host-built `dist` + `node_modules` mounted) against `postgres:16-alpine` + `redis:7-alpine` containers | **Verified here**: `prisma migrate deploy` applied all 13 migrations, server started, migration check up to date; Playwright's Chromium 148.0.7778.96 launched and rendered a PDF (image Playwright 1.60.0 = lockfile `playwright-core` 1.60.0) |
| Frontend: real `nginx:1.27-alpine` with the repo `nginx.conf` serving the built SPA, on the same network as the backend | **Verified here**: `nginx -t` OK, `/` and SPA deep links 200, hashed assets 200, `/api/health` proxied 200, `/api/projects` and the SSE route `/api/realtime/...` proxied (401 without a token) |
| Full `docker compose … up --build` (building both images) | **Not verified here.** The sandbox's egress proxy blocks Debian package mirrors (and plain-HTTP proxying), so `apt-get` in the builder cannot run even with the documented proxy/CA workaround (applied only to scratch copies of the Dockerfiles, never committed). Docker Hub also returned 429 for anonymous pulls at first. The image builds therefore need to be confirmed on a normal machine. |
| Authenticated SSE stream and real Clerk sign-in through nginx | **Not verified** (no real Clerk session possible here; §4) |
| Notes | Builder uses Node 20, the Playwright runtime image ships Node 24.15.0 (fine for the compiled CommonJS). Same-origin via nginx, so no CORS setup; a Clerk development instance accepts `localhost` origins. The frontend's Clerk key is baked in at build time (rebuild after changing it). |

## Remaining gaps (honest list)
- **No live LLM call has been made from inside this sandbox.** Real-provider evidence comes only from the reviewer (§0). On `150bc79` gemma `:free` failed on 429s. On `6cde80e` the round-3 retry + fallback worked and a real audit completed, but vision failed four times (429, empty, 2× truncated JSON). The **round-4** vision fixes (token cap, bounded output, length detection, repair, single retry) and the cooldown-compliance change are verified only with fake responses and the stub. They are **unproven against the real provider** until re-run. Still unknown: real vision quality and truncation rate after the fix; whether honouring long cooldowns makes real audits fail more often (by design they now stop instead of retrying early); and latency against the 180 s step timeout.
- **Local Docker route:** runtime images and nginx verified here; full image builds not (see §7).
- **Concurrency under a real LLM is unproven.** Two parallel audits against the shared free pool will compete for the same rate limit; only stub concurrency was tested.
- The default model is unchanged (`google/gemma-4-31b-it:free`) as instructed, even though the reviewer's run suggests `openrouter/free` is currently more reliable. With round 3, a rate-limited primary falls back to `openrouter/free` automatically.
- **Real-Clerk sign-up not verified** (blocked hosts; see §4). Real sign-in was verified in an earlier session, not in this one.
- Mux 403 not reproduced here (Mux unreachable), only removed.
- ~~The report page shows two different scores~~. **Fixed in round 2** (bugs 13, 16, 17). Caveat: the penalty weights (−5/−10/−15 per UX finding, −1…−8 per visual finding, F-cap 55) are product judgement, not calibrated against real users or a real model's findings.
- ~~The `dead_end` terminal path was not exercised~~. **Exercised in round 2** via the no-exit page (`LOOP_DETECTED`). The original dead-end scenario still ends `FAILED` through the validator-rejection path, which is also exercised.
- Concurrency covers 2 audits × 2 workers in one run. Not covered: worker crash mid-job, BullMQ stalled-job recovery, more than 2 parallel browsers, multiple Node processes hitting the per-process in-memory fallbacks (`memoryDb`) when the DB is down.
- Export formats other than PDF are not implemented (they fail honestly).
- BullMQ retries a job up to 3× only when `runWorkflow` throws (e.g. provider setup failure); a failed agent loop is not retried. Not changed.
- Lint warnings (2.5k, pre-existing) not addressed.
