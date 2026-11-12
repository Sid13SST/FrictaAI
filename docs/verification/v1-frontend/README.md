# V1 frontend — fixture verification

**What this is:** screenshots of the V1 frontend rendered by the dev-only fixture
harness (`apps/frontend/src/fixtures/`) at 390, 768 and 1440 px.

**What this is not:** end-to-end verification. In the harness, sign-in is a mock
(`@clerk/clerk-react` is aliased to a local stub), every `/api` response is canned
sample data answered inside the browser, and no audit ever runs. Nothing here
shows that a real user can sign up, run an audit, and get a report. That still
needs the live walkthrough listed under [Not verified](#not-verified--needs-a-live-walkthrough).

Every screenshot carries an orange "FIXTURE DATA" badge so it can't be mistaken
for a real session.

## How it was produced

```bash
npm run fixtures -w @fricta/frontend              # harness on http://127.0.0.1:3100
npm run fixtures:screenshots -w @fricta/frontend  # writes screenshots/ and layout-report.json
```

- Browser: Playwright Chromium, device scale factor 1, viewports 390×844, 768×1024, 1440×900.
- Every request not addressed to the local harness was blocked, so no call reached
  Clerk, the backend, OpenRouter, or any CDN. Fonts are self-hosted copies
  (`@fontsource/*`) of the families `index.html` loads from Google Fonts.
- The app shell scrolls an inner container. For capture only, the script lets that
  container grow so a full-page image is possible; layout is measured *before*
  that change. The Investigation Console is a fixed-height view and is captured
  at viewport size.
- `layout-report.json` records, per screenshot: PNG width, horizontal overflow of
  the document and of the app's scroll container, any element extending past the
  viewport that isn't clipped by an ancestor, and uncaught browser errors.
  Final run: **103 screenshots, 0 flagged**; every PNG is exactly as wide as its breakpoint.

## What was fixture-verified

"Verified" below means: the PNG was opened and looked at, at each listed width.

### The twelve pages (populated data) — 390 / 768 / 1440

| Page | Files | Notes |
| --- | --- | --- |
| Landing | `landing.png` | Avatar images in the testimonials show alt text: they load from an external host, which the capture blocks. |
| Login | `login.png` | Page frame only — the card is a labelled placeholder, not the Clerk widget. |
| Register | `register.png` | Same caveat as Login. |
| Dashboard | `dashboard.png` | |
| Projects | `projects.png` | |
| Project Detail | `project-detail.png` | |
| Workflow Monitor | `workflow-monitor.png` | Running audit; polling is real React Query against canned responses. |
| Reports | `reports.png` | |
| Report Details | `report-details.png`, `report-details-findings.png` | Below 1024 px the report opens on UX Findings; replay/event-stream/orchestration tabs show the "optimized for desktop" notice by design (KNOWN_ISSUES #6). |
| Investigation Console | `investigation-console.png`, `investigation-console-evidence.png` (1440 only) | Below 1024 px this is the "optimized for desktop" notice by design. Only the Overview and Evidence tabs were captured. |
| Runtime Observability | `runtime-observability.png` | |
| Help Center | `help-center.png` | First section only. |

### States — 390 / 768 / 1440

| State | Files |
| --- | --- |
| Empty | `dashboard--empty`, `dashboard--no-audits`, `projects--empty`, `project-detail--empty`, `reports--empty`, `investigation-console--empty`, `runtime-observability--empty` |
| Loading | `dashboard--loading`, `projects--loading`, `reports--loading`, `report-details--loading`, `runtime-observability--loading`, `workflow-monitor--connecting`, `workflow-monitor--queued`, `login--widget-loading` |
| Error | `dashboard--error`, `projects--error`, `workflow-monitor--error`, `runtime-observability--error` (500 with a database driver message), `reports--error` (network failure) |
| Redirect copy | `login--redirected` |

Reviewed individually at 390 px. At 768 and 1440 px the twelve populated pages
were reviewed; the state variants at those two widths were checked by the
automated layout report and PNG width only, not by eye.

### Defects found in the pixels and fixed

- Sidebar's active item, a monitor divider and several report panels had bright
  white borders/backgrounds: they used opacity steps Tailwind doesn't generate
  (`/16`, `/12`, `/8`, `/3`, `/22`, `/2`) and a shade that doesn't exist (`slate-850`).
- The "How Fricta's AI is working" ribbon rendered as a two-column wall of tiles
  on phones, pushing the audit status a full screen down.
- The top bar labelled the live monitor "Dashboard".
- Report viewer: action buttons wrapped beside the tabs at 768 px; phones opened
  on the desktop-only replay notice instead of real content.
- Investigation Console overview: stat cards and the agent grid were unreadably
  narrow at 1440 px.
- Runtime Observability's "LIVE" badge wrapped at 768 px.
- Landing "See It In Action" window header overflowed at 390 px.
- Register showed two "Already have an account?" links.

### The 390 px overflow report (Dashboard 619 px, Project Detail 538 px)

An independent re-run of the harness produced full-page PNGs wider than 390 px
for these two pages. Re-checked with the page left untouched (plain viewport
screenshot, no capture CSS): document and scroll-container width are exactly
390 px, the right-most element ends at x=374, stat cards sit two-up and audit
titles truncate. The extra width came from the screenshot script as it stood in
an earlier commit — its capture CSS removed `overflow: hidden` from `<main>`,
which also removed that element's implicit `min-width: 0` and let truncated
text stretch the layout. So this was a capture artifact, not a layout bug a user
would see. Three things changed anyway:

- the script keeps `min-width: 0` during capture and now fails if any PNG is
  wider than its viewport;
- `<main>` carries an explicit `min-w-0`, so it no longer depends on `overflow` for that;
- the Dashboard and Project Detail stat grids collapse to one column below 340 px.
  They stay two-up at 390 px because that is what the pixels show working; moving
  the collapse point up to 390 is a one-class change if preferred.

## Not verified — needs a live walkthrough

None of the following can be established from fixtures.

1. **Real Clerk sign-up and sign-in.** The actual `<SignIn>` / `<SignUp>` widgets
   were never rendered. Unseen: the shared appearance (card, buttons, error and
   alert styling, spinner, OTP inputs), Clerk's own error messages (wrong
   password, existing account, rate limit), Google sign-in, email verification,
   the redirect to `/app`, sign-out, and the `/app` "Checking your session…"
   loader followed by a real redirect for a signed-out visitor.
2. **A real audit run.** Launching from the wizard against the real backend with
   an OpenRouter key, the worker picking the job up, live thoughts/actions
   arriving over time, the queued → running → completed transitions, the stall
   notice, and failure/timeout outcomes.
3. **Real data shapes.** Fixture payloads were hand-written from the route
   handlers and Prisma schema. Report, console and runtime responses from a real
   run may differ; one such mismatch (finding `evidence` is a string) was caught
   while building the fixtures.
4. **Error copy against real failures.** Mapping was exercised with a synthetic
   500 and a synthetic network failure. Real 401/403/404/400 responses, a real
   database outage, and expired-session behaviour mid-page were not.
5. **Mutations.** Creating, editing and deleting a project, updating a finding's
   status/notes, running UX diagnostics, and PDF/Markdown/JSON export downloads.
6. **Real screenshots and replay.** Replay, evidence and annotated-screenshot
   views were only seen with a placeholder image.
7. **SSE in the Investigation Console.** The harness replaces `EventSource` with
   an inert stub.
8. **Routes not captured:** audit wizard (`/app/workflow`), Live Telemetry,
   History, Learning Center, the 404 page, and every Help Center section after
   the first.
9. **Other browsers and real devices.** Chromium only; no Safari/Firefox, no
   touch, no real phone.
10. **Toasts and modals** were not screenshotted.
