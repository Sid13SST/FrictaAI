# syntax=docker/dockerfile:1

# ── Builder ─────────────────────────────────────────────────────────────────
# Builds the backend and every @fricta/* workspace package it depends on.
FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages packages

RUN npm ci

COPY apps/backend apps/backend

# Prisma client generation is a separate step from `build` in @fricta/db.
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma
RUN npx turbo run build --filter=@fricta/backend...

# ── Runtime ─────────────────────────────────────────────────────────────────
# Uses Microsoft's Playwright image so Chromium + OS deps are preinstalled —
# the backend launches a headless browser for PDF report export.
FROM mcr.microsoft.com/playwright:v1.60.0-jammy AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/backend ./apps/backend

EXPOSE 3001

# Applies any pending migrations, then starts the API server.
CMD ["sh", "-c", "npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma && node apps/backend/dist/index.js"]
