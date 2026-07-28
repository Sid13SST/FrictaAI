# Refactoring Plan – FrictaAI Monorepo

*Generated from the exhaustive architecture & security audit. Goal: reduce complexity, improve type‑safety, harden security, and prepare the codebase for incremental, low‑risk modernization.*

---

## 1️⃣ Top 3 Most Complex Components

| Rank | Path | Lines | Why complex |
|------|------|-------|--------------|
| **1** | `apps/frontend/src/pages/WorkspaceConsole.tsx` | ~3 893 | 85 `useState`, 91 `if` branches, 74 `try/catch`, heavy conditional rendering, deeply nested data handling. |
| **2** | `apps/frontend/src/pages/SimulationConsole.tsx` | ~2 842 | Large switch, 16 `try/catch`, many `map/reduce` pipelines, mixed UI + data logic. |
| **3** | `apps/backend/src/routes/reports.ts` | ~1015 | 26+ Hono handlers (now including PDF export via Playwright), business logic directly inside the router, 20+ `try/catch` blocks. |

---

## 2️⃣ Proposed Architectural Changes

### 2.1 Frontend – Split page‑level monoliths
| Action | Rationale | Impact |
|--------|-----------|--------|
| Extract UI sub‑sections into lazy‑loaded components (`WorkspaceHeader`, `SessionTimeline`, `ReplayControls`). | Cuts file size, enables code‑splitting, limits re‑render scope. | Initial bundle ↓ ≈ 30 %, first‑paint ↓ ≈ 200 ms. |
| Move data‑fetching & business logic into a `services/` layer (`workspaceService.ts`, `simulationService.ts`). | UI stays presentational, improves testability. | UI LOC ↓ ≈ 40 %, unit‑coverage ↑ ≥ 80 %. |
| Introduce Zustand store for cross‑page state instead of prop‑drilling. | Removes repetitive `useEffect` chains. | Render passes ↓ ≈ 15 %. |
| Adopt `React.Suspense` + `React.lazy` for heavy sub‑trees. | Keeps UI responsive while data loads. | Perceived smoothness ↑ ≈ 30 %. |
| Create `features/<feature>/{components,hooks}` folder structure. | Enforces cohesion, enables future micro‑frontend extraction. | Maintenance effort ↓ ≈ 25 %. |

### 2.2 Backend – Controller / Service separation
| Action | Rationale | Impact |
|--------|-----------|--------|
| Thin routing layer that only registers paths and delegates to `controllers/*.ts`. | Routes stay < 200 LOC, isolate validation/response. | `routes/*.ts` size ↓ ≈ 60 %. |
| Move business logic into `services/*.ts` (`reportsService.ts`, `workspaceService.ts`). | Re‑use across routes, simplifies testing. | Test coverage ↑ ≥ 85 %, dup code ↓ ≈ 30 %. |
| Standardise validation with **Zod** schemas (reuse pattern from `utils/envValidation.ts`). | Runtime type safety, rejects malformed payloads early. | Security risk ↓ ≈ 50 %. |
| Extract common error handling into reusable middleware. | Removes 20+ duplicated `try/catch` blocks. | Duplication ↓ ≈ 40 %, response consistency ↑. |
| Each high‑level domain lives in its own `packages/` feature‑package. | Independent versioning, future service extraction. | Build time ↓ ≈ 15 %. |

### 2.3 Monorepo hygiene
- Enable **ESLint project rules**: `max-lines-per-file: 500`, `max-nested-callbacks: 4`.
- Add **`turbo` pipeline step** `typecheck:ci` running `tsc` per package in isolation to catch cross‑package type leaks.

---

## 3️⃣ Performance Optimizations

| Area | Change | Why |
|------|--------|-----|
| **Frontend bundle** | Vite `manualChunks` to split `recharts`, `framer-motion`. | Smaller initial payload, vendor caching. |
| | Tree‑shake UI utils (`lodash` → `lodash-es`). | Less parse time. |
| | `react-virtualized` for long lists in `WorkspaceConsole`/`SimulationConsole`. | Keeps DOM node count low → smoother scroll. |
| **Data fetching** | Debounce rapid state updates that trigger API calls (search, timeline scrub). | Fewer network round‑trips. |
| | Server‑side pagination on report endpoints (`GET /reports?cursor=`). | Backend query load ↓, payload ↓. |
| **Backend** | Hono `compress()` middleware. | Reduces bandwidth for JSON. |
| | `Cache-Control: max-age=60` on static/reference endpoints. | Lower latency on repeat calls. |
| | Add DB indexes on high‑selectivity filter columns in `reports`. | Query latency ↓ ≈ 40 %. |
| **Observability** | Export Prometheus histograms per‑endpoint (already have `prom-client`). | Data‑driven tuning. |

---

## 4️⃣ Security Hardening Steps

> ✅ = already done as of the V1 launch pass — see [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) for verification detail. Remaining rows are still real backlog items, not blockers for V1.

| Step | Implementation | Status |
|------|----------------|--------|
| **Ownership checks** | `apps/backend/src/guards/ownership.ts` exports `requireProjectOwner`, `requireWorkflowOwner`, `requireFindingOwner`, `requireReportOwner`, verifying the full relation chain to `userId`. | ✅ Done |
| **JWT verification** | Real Clerk JWKS verification via `@hono/clerk-auth`'s `clerkMiddleware()` + `getAuth()` (`apps/backend/src/middleware/clerkAuth.ts`) — not a stub. | ✅ Done |
| **Secrets at rest** | OAuth tokens (`WorkspaceIntegration`) AES‑256‑GCM encrypted via `packages/integration-core/src/oauth/crypto.ts`; backend refuses to start without `TOKEN_ENCRYPTION_KEY` in production. | ✅ Done |
| **Helmet‑style headers** | `hono/secure-headers` applied globally with explicit CSP (`default-src 'none'`), `X-Frame-Options: DENY`, `Cross-Origin-Resource-Policy: same-site`. | ✅ Done |
| **CORS scoping** | Restricted to `FRONTEND_URL` allow‑list with credentials, not a wildcard. | ✅ Done |
| **Input validation** | Couple every `app.<method>()` with a Zod schema (`body`, `params`, `query`); reject `400` on failure. | ⬜ Backlog |
| **Rate limiting** | `hono-rate-limit` (or token bucket) on heavy endpoints (`/reports`, `/workspace`). | ⬜ Backlog |
| **Dependency audit** | `npm audit` in CI; fail on high/critical. `react-router` v6 advisories are an accepted risk for V1 (see KNOWN_ISSUES.md), deferred to a V1.1 major upgrade. | ⬜ Backlog |
| **Audit logging** | Extend `customLogger` to capture `userId`, `endpoint`, `status`, `payloadHash` (no PII); tamper‑evident store. | ⬜ Backlog |
| **Static analysis** | Add `eslint-plugin-security`; CI fails on `eval`, `new Function`, unsanitized SQL. | ⬜ Backlog |

---

## 5️⃣ Incremental Migration Strategy

| Phase | Goal | Concrete Tasks | Success Criteria |
|-------|------|----------------|------------------|
| **0 – Baseline** | Capture current metrics | `npm run typecheck`; record bundle size (`vite build --mode=production`); export test coverage. | Baseline stored in `docs/metrics/`. |
| **1 – Foundations** | Shared utilities & standards | Create `packages/ui-components`; add Zod to backend; add ESLint size/complexity rules. | Lint passes, no new type errors. |
| **2 – Split Frontend Pages** | Reduce page file size | Extract > 2 sub‑components from `WorkspaceConsole` & `SimulationConsole` → `features/*/components`; wire `React.lazy`; add unit tests. | Each page ≤ 1 200 LOC; bundle ↓ ≥ 20 %. |
| **3 – Backend Controllers** | Clean route files | Create `controllers/reportsController.ts` + `services/reportsService.ts`; migrate logic; replace duplicated `try/catch` with global handler. | `routes/reports.ts` < 200 LOC; 100 % route tests pass. |
| **4 – Performance** | Caching, pagination, code‑split | Paginate `/reports`; add Vite `manualChunks`; enable Hono `compress()`. | API response time ↓ ≥ 30 %; bundle ↓ ≥ 15 %. |
| **5 – Security Hardening** | Defensive defaults | Ownership guards, real JWT verification, CSP headers, and OAuth token encryption are done (see §4); remaining: Zod input validation, rate‑limiting, `npm audit` gating in CI. | No security lint warnings; CI fails on audit issues. |
| **6 – CI/CD & Monitoring** | Quality gates | CI: lint → typecheck → test → audit → build‑size check; deploy Prometheus dashboard. | All pipelines green; dashboard live. |
| **7 – Optional Micro‑service Extraction** | Future‑proof scaling | Identify splittable domain (e.g., `reports`); Dockerfile + Helm chart. | Service runs independently with same API contract. |

> **Tip:** Perform each phase on a feature branch, open a PR, run the full CI suite, and merge only after success criteria are met. This “incremental yet gated” approach keeps the codebase stable while the refactor progresses.

---

## 6️⃣ Summary
The three largest/most complex files (`WorkspaceConsole.tsx`, `SimulationConsole.tsx`, `routes/reports.ts`) are the prime extraction/modularization targets. By **splitting UI pages**, **introducing controller/service layers**, **standardizing validation**, **optimizing bundle delivery**, and **hardening security**, the project gains:

- **Maintainability** – files reduced to manageable sizes, clear separation of concerns.
- **Performance** – smaller initial bundles, server‑side pagination, caching, compression.
- **Security posture** – systematic RBAC, input validation, rate‑limiting, hardened headers.
- **Scalable evolution** – architecture ready for micro‑service extraction of high‑traffic domains.

Follow the phased plan above to realize these gains with minimal disruption to development velocity.
