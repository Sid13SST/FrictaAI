# Known Issues & Accepted Technical Debt — V1

Tracked items that are known, deliberately deferred, and not blocking V1 launch. Each entry states the decision and why, so it isn't re-litigated or "rediscovered" as a surprise later.

---

## 1. `react-router` — open redirect + SSR constructor injection advisories

**Status:** Accepted risk for V1. Scheduled for V1.1.

- **What:** `react-router`/`react-router-dom` 6.x carries three published advisories:
  - Open redirect via backslash in `<Link>` / `useNavigate` (GHSA-wrjc-x8rr-h8h6)
  - Arbitrary constructor injection via `deserializeErrors()` during SSR hydration (GHSA-337j-9hxr-rhxg)
  - Open redirect leading to XSS, `react-router-dom`'s own advisory for the same class of issue (GHSA-jjmj-jmhj-qwj2)
- **Fix requires:** upgrading to v7.18+, a major version bump with breaking API changes across every route in the app.
- **Why deferred:**
  - The SSR hydration CVE does not apply — this app is a client-rendered SPA, no server-side rendering with React Router occurs.
  - The open-redirect vector requires attacker-controlled input reaching `<Link to=...>` / `navigate(...)` unsanitized. Audited current usage: no route in this app passes untrusted external input into navigation targets — all `Link`/`navigate` calls use static paths or internal resource IDs.
  - A major routing library upgrade this close to launch risks subtle navigation regressions across the entire app, which is a worse near-term risk than the (currently low-exploitability) advisories themselves.
- **Action:** upgrade to react-router v7 as the first V1.1 maintenance item, with a full click-through regression pass across every route afterward.
- **Re-evaluate immediately if:** any future feature accepts a redirect URL, callback URL, or external link from user/API input and feeds it into `Link`/`navigate` — that would change the risk calculus and should not wait for V1.1.

## 2. `@hono/node-server` — path traversal in `serve-static` (Windows)

**Status:** Not exploitable in this app; low priority.

- The vulnerable code path is the `serveStatic` middleware. This backend never uses it — static assets are served by nginx (frontend container) and screenshots/exports go through custom, path-sanitized route handlers. Safe to leave on the current version; revisit only if `serveStatic` is ever introduced.

## 3. Dev-tooling dependency chain (ESLint/glob/rimraf/minimatch)

**Status:** Not a production risk.

- The majority of `npm audit`'s "high" count lives in the ESLint/TypeScript-ESLint/glob/rimraf/flat-cache dependency chain — build/dev tooling only, never shipped to the browser or the running backend. Low priority; will clear as upstream packages release fixes.

## 4. Workspace Executive Reporting (`WorkspaceConsole.tsx`) — built but unrouted

**Status:** Out of scope for V1 by design.

- A full workspace-level executive reporting feature (multi-project rollups, `ExecutiveReport` model, its own PDF export pipeline via `ExportProcessingService`) exists in the codebase but isn't linked from navigation or any route. The V1 spec's "Reports" requirement is satisfied by the session-level report (already shipped). Leave unwired for V1; revisit if workspace/team-level reporting becomes a real requirement.

## 5. Lint backlog

**Status:** Non-blocking, incremental cleanup.

- ~2,500 ESLint warnings (mostly `no-explicit-any` and `no-console`) across older packages. Zero errors; `npm run lint` passes. Being cleared incrementally, not a launch blocker.

## 6. Mobile / responsive support

**Status:** In progress — see the V1 responsive requirements below, being implemented directly rather than deferred.

- Must be fully responsive: Landing, Login/Register, Dashboard, Projects, Reports list, Findings, Help Center, Navigation.
- Tablet-friendly (not full phone parity): Workflow Monitor, Runtime Observability.
- Desktop-only, with an explicit "optimized for desktop" message on small screens: Session Replay, Evidence Explorer, Live Timeline, the large Report Viewer (replay/orchestration tabs).

## 7. `WorkspaceIntegration` has no owning-user column

**Status:** ✅ Fixed. Added a `userId` column (migration `20260729130000_add_workspace_integration_owner`) that's set on every new solo-mode connection. `OAuthManager` (upsert/get/revoke/markExpired/list), `IntegrationPermissionGuard.requireConnected`, `IntegrationGovernanceLogger.getAuditLog`, and `IntegrationTimeline.getUnifiedTimeline` all now scope solo-mode (`workspaceId` null) lookups to the caller's own `userId` instead of matching any row with a null `workspaceId`. `/sync/jobs` also gained an ownership check on the caller-supplied `integrationId` (previously none at all), and `/events` now verifies project ownership when a `projectId` is passed.
- **Note:** no backfill was possible — pre-existing solo-mode rows never recorded who created them, so historical connections have `userId = NULL` and will no longer be returned to *any* solo user post-fix (fails closed, not open). Anyone who connected an integration before this fix will need to reconnect it.

## 8. `security.ts` `/compliance/retention` — no ownership check on `resourceId`

**Status:** ✅ Fixed. The route now verifies the caller owns the target resource (`verifyWorkflowOwnership`/`verifyReportOwnership`/`verifyInvestigationOwnership` depending on `resourceType`) before applying a retention policy, the same pattern `/traceability` already used just above it in the same file.

## 9. CI's `npm audit` gate was failing on every push

**Status:** ✅ Fixed. `npm audit --audit-level=high` hard-failed on every push because it had no way to encode the accepted-risk decisions in #1–#3 above. CI now runs `npm run audit` (`better-npm-audit`, see root `.nsprc`), which excepts exactly the five advisories covered by #1–#3 by GHSA ID, each with a note and a 2026-11-30 expiry to force re-evaluation, and still hard-fails on anything not on that list. Re-run `npm run audit` after any dependency bump to confirm nothing new snuck in.
