# Fricta Setup Guide

## Prerequisites
- Node.js >= 18 (verified on 22)
- PostgreSQL 16 (local or Docker)
- Redis 7 (local or Docker)
- Chromium for Playwright (installed in step 4)

## 1. Install Dependencies
```bash
npm ci
```
`npm ci` no longer downloads browsers as a side effect (the old `postinstall`
in `packages/agent` ran `npx playwright install` on every install and broke
installs on machines that block the browser CDN). Install the browser
explicitly in step 4.

## 2. Environment Variables
Copy `.env.example` to `.env` (repo root) and fill in the keys. `.env` is
gitignored; never commit real keys.

```bash
DATABASE_URL="postgresql://fricta:fricta_dev@localhost:5432/fricta?schema=public"
REDIS_URL="redis://localhost:6379"
OPENROUTER_API_KEY="sk-or-v1-..."        # free OpenRouter account is enough
CLERK_PUBLISHABLE_KEY="pk_test_..."      # from your Clerk app
CLERK_SECRET_KEY="sk_test_..."
VITE_CLERK_PUBLISHABLE_KEY="pk_test_..." # same publishable key, for the frontend
```

### AI models — free by default
| Variable | Default | Notes |
|---|---|---|
| `AGENT_MODEL` | `google/gemma-4-31b-it:free` | Planner model (text). |
| `AGENT_VISION_MODEL` | `google/gemma-4-31b-it:free` | Screenshot analysis; must accept image input. |
| `ALLOW_PAID_MODELS` | unset | Only the exact value `true` allows a non-free model. |
| `AGENT_BASE_URL` | `https://openrouter.ai/api/v1` | Any OpenAI-compatible endpoint (`<base>/chat/completions`). |
| `AGENT_API_KEY` | falls back to `OPENROUTER_API_KEY` | Key for `AGENT_BASE_URL`; optional for non-OpenRouter endpoints. |
| `AGENT_MAX_TOKENS` | `150` | Completion cap per planner call. |

**Zero-spend guard.** A model id counts as free only if it ends in `:free` or
is `openrouter/free`. Any other id makes the backend refuse to start
(`CRITICAL_STARTUP_ERROR: AGENT_MODEL="..." is not a free model`), and the
provider factory throws if it is changed at runtime, unless
`ALLOW_PAID_MODELS=true`. The rule is applied to every endpoint, because a
model id cannot prove that a third-party endpoint is free. So a self-hosted
endpoint whose ids lack `:free` needs `ALLOW_PAID_MODELS=true`, set on purpose.

OpenRouter rotates its free variants. If audits start failing with
`404 No endpoints found`, pick a current one at
<https://openrouter.ai/models?max_price=0> (for vision, filter input modality
"image") and set `AGENT_MODEL` / `AGENT_VISION_MODEL`. Free variants are
rate-limited by OpenRouter.

### Optional
- `CLERK_JWT_KEY`: Clerk JWT public key (PEM). The backend then verifies
  session tokens locally instead of fetching JWKS.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`: use a preinstalled Chromium for the
  agent, the browser pool and PDF export.

## 3. Database & Services
Start the local services via Docker Compose:
```bash
docker compose up -d
```
Then apply the Prisma migrations and generate the client:
```bash
cd packages/db && npx prisma migrate deploy && npx prisma generate && cd ../..
```
(`migrate deploy` reads `DATABASE_URL` from the environment, so export it
first or prefix the command.)

## 4. Install Browsers
```bash
npx playwright install chromium
```

## 5. Build & Run
The workspace packages are consumed from their `dist/` output, so build once:
```bash
npx turbo run build
```
Then start everything:
```bash
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## 6. Tests
```bash
npm run typecheck
```
```bash
npm run lint
```
```bash
npm run test:unit --workspace=@fricta/backend
```

End-to-end audit pipeline against a **local LLM stub** (deterministic, not a
live model; needs Postgres, Redis and a built workspace):
```bash
npm run test:e2e:stub --workspace=@fricta/backend
```
It boots the real backend with `AGENT_BASE_URL` pointed at
`apps/backend/e2e/stub-llm-server.mjs` and drives launch → worker → status →
SSE → report → findings → replay → exports, including cross-user isolation
checks. See `docs/verification/v1-finish/README.md` for what this does and
does not prove.
