# Known Issues & Accepted Technical Debt — V1

Tracked items that are known, deliberately deferred, and not blocking V1 launch. Each entry states the decision and why, so it isn't re-litigated or "rediscovered" as a surprise later.

---

## 1. `react-router` — open redirect + SSR constructor injection advisories

**Status:** Accepted risk for V1. Scheduled for V1.1.

- **What:** `react-router`/`react-router-dom` 6.x carries two published advisories:
  - Open redirect via backslash in `<Link>` / `useNavigate` (GHSA-wrjc-x8rr-h8h6)
  - Arbitrary constructor injection via `deserializeErrors()` during SSR hydration (GHSA-337j-9hxr-rhxg)
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

**Status:** Real gap, needs a schema migration — not a route-level fix. Flagged during the full IDOR/BOLA remediation pass, not yet closed.

- The `WorkspaceIntegration` model (third-party OAuth connections — Figma/Jira/Linear/GitHub/Notion/ProductBoard) only has a nullable `workspaceId`, no `userId`/`projectId`. `IntegrationPermissionGuard`'s `canReadIntegrations`/`canManageIntegrations`/`canPushEvidence` all special-case `if (!workspaceId) return true`, so in solo mode (no workspace) these routes (`/connections`, `/oauth/connect`, `/oauth/revoke`, `/events`, `/governance`, `/sync/jobs`) are genuinely unscopable between different solo users — any authenticated solo-mode user could read/manage another solo-mode user's connected integrations.
- **Fix:** add a `userId` column to `WorkspaceIntegration`, backfill from whatever created the connection, then gate solo-mode access on it the same way `security.ts`/`workspace.ts` now do for their nullable-`workspaceId` tables. Do not ship this integration surface broadly to solo-mode users before this lands.

## 8. `security.ts` `/compliance/retention` — no ownership check on `resourceId`

**Status:** Real gap, low severity, not yet fixed.

- Found during the same remediation pass as #7 above; ran out of scope to fix in that pass. The route accepts an arbitrary `resourceId` with no verification the caller owns the resource it points at. Needs the same treatment as the rest of `security.ts` (scope to caller in solo mode / workspace-permission check when a workspace is present) before this endpoint is exposed to real users.
