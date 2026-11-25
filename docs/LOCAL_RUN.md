# Run Fricta on your own computer (Docker, zero hosting cost)

This runs the whole stack (Postgres, Redis, backend API + audit worker +
headless Chromium, and the frontend behind nginx) on your machine with
`docker-compose.prod.yml`. Nothing is deployed publicly. Ports bind to
`127.0.0.1` only. No new accounts, domains or paid services are needed beyond
the two below, both of which have free tiers.

## Prerequisites

| Need | Notes |
|---|---|
| Docker with Compose v2 | Docker Desktop (macOS / Windows) or Docker Engine + compose plugin (Linux). About 6 GB free disk for images. 4 GB+ RAM given to Docker. |
| A Clerk application (free) | Its **publishable key** (`pk_test_…`) and **secret key** (`sk_test_…`). A development instance accepts `http://localhost:<port>` origins by default. |
| An OpenRouter API key (free account) | For the default `:free` models. Or set `AGENT_BASE_URL` to another OpenAI-compatible endpoint you run yourself. |
| Internet access during the first build | npm packages, Docker images (`node:20-slim`, `nginx:1.27-alpine`, `mcr.microsoft.com/playwright:v1.60.0-jammy`, `postgres:16-alpine`, `redis:7-alpine`). |

No Node.js install is needed on the host for this route.

## Steps

```bash
cp .env.example .env
```

Edit `.env` and set at least:

- `POSTGRES_PASSWORD`: any local password
- `TOKEN_ENCRYPTION_KEY`: generate with `node -e "console.log('base64:'+require('crypto').randomBytes(32).toString('base64'))"` (or `openssl rand -base64 32`, prefixed with `base64:`)
- `CLERK_PUBLISHABLE_KEY` and `VITE_CLERK_PUBLISHABLE_KEY`: the same `pk_test_…` value
- `CLERK_SECRET_KEY`: `sk_test_…`
- `OPENROUTER_API_KEY`: or `AGENT_BASE_URL`
- optional: `FRONTEND_PORT` (default `8080`)

`DATABASE_URL` and `REDIS_URL` in `.env` are ignored by this compose file. The
backend is always pointed at the `postgres` / `redis` containers.

Check everything without printing any secret:

```bash
scripts/local-preflight.sh
```

Build and start (the first build takes several minutes):

```bash
docker compose -f docker-compose.prod.yml --env-file .env up --build -d
```

Open <http://localhost:8080> and sign up or sign in with Clerk.

Logs and stop:

```bash
docker compose -f docker-compose.prod.yml logs -f backend
```

```bash
docker compose -f docker-compose.prod.yml down
```

(`down -v` also deletes the database, Redis and screenshot volumes.)

## How the pieces fit

- **Frontend image:** `npm ci` over the whole workspace, then `turbo run build --filter=@fricta/frontend...` (builds the `@fricta/ui` workspace package first). The Clerk publishable key is baked in at build time, so **rebuild after changing it** (`up --build`). nginx serves the SPA and proxies `/api/` to `backend:3001`, with buffering off for the SSE streams under `/api/realtime/…`. The browser therefore talks to one origin (`localhost:8080`), and no CORS setup is needed.
- **Backend image:** built on `node:20-slim` with OpenSSL installed, so Prisma picks OpenSSL-3 engines (`binaryTargets` also pins `debian-openssl-3.0.x`). It runs on `mcr.microsoft.com/playwright:v1.60.0-jammy`, the same Playwright version as `package-lock.json` (1.60.0), so Chromium for the agent and for PDF export is already in the image. On start it runs `prisma migrate deploy`, then `node apps/backend/dist/index.js`. Audit screenshots and exports are kept in the `fricta_storage` volume.
- **Models:** free `:free` models only, unless you set `ALLOW_PAID_MODELS=true`. Re-check availability with `npm run check:models --workspace=@fricta/backend` (needs Node on the host) or see `docs/SETUP.md`.

## Known limits

- Free models are rate-limited. Audits retry, honour the provider's cooldowns and may fall back to `openrouter/free`, but a long cooldown can still fail an audit; it is then reported as not scored.
- The Clerk sign-up flow uses Cloudflare Turnstile. It needs `*.clerk.accounts.dev` and `challenges.cloudflare.com` reachable from your browser.
