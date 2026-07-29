# Security Audit – FrictaAI Monorepo

*Refreshed after a full re-verification pass, including a systematic IDOR/BOLA (Broken Object-Level Authorization) sweep across all 41 backend route files. This version reflects direct code inspection and real fixes applied in this pass, not carried-over claims.*

---

## 1️⃣ Overview

Scope: authentication/authorization, secret handling, input validation, and dependency vulnerabilities across `apps/` and `packages/`. For accepted-risk items (things found but deliberately not fixed for V1), see **[KNOWN_ISSUES.md](./KNOWN_ISSUES.md)** — this document covers what's fixed and what's still a real gap.

---

## 2️⃣ Authentication & Authorization — ✅ Solid (after this pass's remediation)

| Area | Status | Detail |
|---|---|---|
| JWT verification | ✅ Real | `apps/backend/src/middleware/clerkAuth.ts` uses `@hono/clerk-auth`'s `clerkMiddleware()` + `getAuth()`, backed by Clerk's actual JWKS verification — not a stub. |
| Auth enforcement | ✅ Real | `requireAuth` middleware rejects with 401 when `getAuth(c).userId` is missing. Applied per protected route group in `apps/backend/src/index.ts`. |
| Ownership checks | ✅ Real, now applied consistently | `apps/backend/src/guards/ownership.ts` exports `verifyProjectOwnership`/`verifyWorkflowOwnership`/`verifyFindingOwnership`/`verifyReportOwnership`/`verifyInvestigationOwnership`/`verifyAlertOwnership` plus Hono middleware wrappers — all traverse the real relation chain (e.g. `UXFinding → WorkflowSession → Project → userId`) before allowing access. **Previously only 7 of 41 route files used these at all** (`reports`, `ux`, `workflows`, `realtime`, `public`, `collaboration`, `projects`); a systematic sweep of the remaining 34 found the same class of gap repeated across nearly all of them — `requireAuth` proved someone was logged in, but nothing verified they owned the specific resource ID in the request. All 34 files (`console`, `historical`, `memory`, `orchestrator`, `agents`, `liveIntelligence`, `simulation`, `cognition`, `swarm`, `agent`, `engineering`, `visual`, `runtime`, `security`, `rbacCore`, `integrations`, `telemetry`, `workspace`, `workspaceCore`, `redesign`, `autonomous`, `strategy`, `outcomes`, `portfolio`, `predictive`, `executive`, `knowledge`, `learning`, `forecasts`, `wisdom`, `intelligence`, `optimization`, `personas`) were audited and patched (`personas` confirmed genuinely static/global, no fix needed). |
| Cross-tenant data leaks (not just IDOR) | ✅ Fixed | Two routes were worse than "guessable ID" IDOR — they leaked data from **every** solo-mode user platform-wide with no ID guessing required: `security.ts`'s audit/governance/alert endpoints and `workspace.ts`'s `GET /projects` both fell back to querying `where: { workspaceId: null }` with no `userId` filter whenever the caller omitted `workspaceId` (the common solo-mode case). Both now scope that fallback to the caller's own `userId`. |
| Blank-screen navigation bug | ✅ Fixed (unrelated to auth, noted for completeness) | Root-caused to leaked `EventSource` connections in Investigation Console exhausting the browser's per-origin HTTP connection cap, hanging the *next* navigation's request indefinitely. Fixed the dead unmount guard and added a top-level `ErrorBoundary` (previously the app had none) as a defensive backstop against any future uncaught render error. |
| Dead auth stub | ✅ Removed | The old `/api/auth` routes (`{token:'placeholder_token'}`) have been deleted along with their mount. |
| Session cookie fallback | ⚠️ Note | The frontend's `apiFetch()` was fixed this session to read the correct Clerk global (`window.Clerk`, not `window.__clerk__`) and now actually attaches the documented `Authorization: Bearer` header. Auth was never broken in practice — Clerk's session cookie covered it regardless — but the explicit header now works as intended too. |
| Known remaining gaps | ✅ Fixed | `WorkspaceIntegration` now has an owning-user column and is scoped per-caller in solo mode (KNOWN_ISSUES.md #7). `security.ts`'s `/compliance/retention` now checks ownership on the caller-supplied `resourceId` (KNOWN_ISSUES.md #8). |

---

## 3️⃣ Secrets & Credential Handling — ✅ Solid

| Area | Status | Detail |
|---|---|---|
| `.env` in git | ✅ Not tracked | `git ls-files .env` returns nothing; only `.env.example` (placeholders) is committed. |
| OAuth integration tokens | ✅ Fixed this session | `WorkspaceIntegration.accessToken`/`refreshToken` are now AES-256-GCM encrypted at rest via `packages/integration-core/src/oauth/crypto.ts`, applied transparently in `OAuthManager` (the single read/write path — verified no other code touches these columns directly). Backend refuses to start encrypting/decrypting tokens in production without `TOKEN_ENCRYPTION_KEY` set. |
| API tokens in URLs | ⚠️ Accepted tradeoff | SSE (`EventSource`) connections can't set custom headers, so a short-lived token is passed via `?token=` and rewritten server-side into the `Authorization` header by dedicated middleware before any route logic runs. Query-string tokens can leak via logs/referrers; scope is limited to SSE streams and tokens are Clerk session JWTs (short-lived), not long-lived API keys. |

---

## 4️⃣ Input Validation & Injection — ✅ Solid

| Area | Status | Detail |
|---|---|---|
| Raw SQL | ✅ None found | No `$queryRaw`/`$executeRaw` usage in `apps/backend/src/routes/reports.ts` or elsewhere searched. All queries go through Prisma's parameterized query builder. |
| `eval()` | ✅ None found | No `eval(` in `packages/agent/src` or elsewhere. |
| `dangerouslySetInnerHTML` | ✅ Verified safe | All current usages render hardcoded static `<style>` CSS strings, not user- or DB-sourced content — not an XSS vector. |
| Path traversal (export storage) | ⚠️ Hardening opportunity | `DiskExportStorage.save(fileName, data)` in `apps/backend/src/routes/reports.ts` doesn't sanitize `fileName` itself. The one current caller passes a server-generated UUID (not user input), so it isn't exploitable today — but the interface should validate/sanitize defensively before any future caller passes less-trusted input. |

---

## 5️⃣ Transport & Headers — ✅ Solid

- `hono/secure-headers` is applied globally (`apps/backend/src/index.ts`) with explicit `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`, `X-Frame-Options: DENY`, and `Cross-Origin-Resource-Policy: same-site`, plus Hono's other secure defaults for unset headers.
- CORS is scoped to explicit allowed origins from `FRONTEND_URL` (comma-separated list supported for staging/preview), with credentials enabled only for those origins — not a wildcard.

---

## 6️⃣ Dependency Vulnerabilities

See **[KNOWN_ISSUES.md](./KNOWN_ISSUES.md)** for the full reasoning. Summary:

| Package | Status |
|---|---|
| `react-router` / `react-router-dom` 6.x | ⚠️ Open advisories, accepted risk for V1 — needs a major v7 upgrade, deferred to V1.1. |
| `@hono/node-server` | ✅ Not exploitable — vulnerable `serveStatic` middleware is never used. |
| ESLint/glob/rimraf toolchain | ✅ Not a runtime risk — dev/build tooling only, never shipped. |

Run `npm audit` for the live count; as of this audit it reports 19 findings, of which only the two above are relevant to the shipped application.

---

## 7️⃣ Verification Checklist

- [x] `npm run typecheck` passes with zero errors (backend and frontend, re-verified after the IDOR remediation pass).
- [x] All backend routes requiring auth return 401 without a valid session.
- [x] Ownership guards verified on project/workflow/finding/report routes.
- [x] Ownership/permission checks now applied across all 41 route files (was 7/41) — see §2 for the full list and the two cross-tenant leaks that were fixed, not just theoretical IDORs.
- [x] OAuth tokens in the DB are encrypted (round-trip tested).
- [x] CSP/X-Frame-Options/CORP headers present on responses.
- [x] No `dangerouslySetInnerHTML` renders unsanitized/dynamic content.
- [x] No raw SQL, no `eval()`.
- [x] `.env` confirmed not committed to git.
- [ ] `react-router` upgraded to a non-vulnerable version — deferred to V1.1 (see KNOWN_ISSUES.md).
- [x] `WorkspaceIntegration` owning-user column (schema migration) — fixed, see KNOWN_ISSUES.md #7.
- [x] `security.ts` `/compliance/retention` ownership check — fixed, see KNOWN_ISSUES.md #8.

---

*This audit reflects direct code inspection as of this session. Re-verify before relying on it if significant time has passed or major dependencies have changed.*
