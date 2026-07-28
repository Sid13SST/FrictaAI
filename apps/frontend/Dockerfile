# syntax=docker/dockerfile:1

# ── Builder ─────────────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages packages

RUN npm ci

COPY apps/frontend apps/frontend

# Vite inlines VITE_* env vars at build time — pass them as build args.
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_API_BASE=/api
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_API_BASE=$VITE_API_BASE

RUN npx turbo run build --filter=@fricta/frontend...

# ── Runtime ─────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
