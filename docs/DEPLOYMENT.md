# Fricta Deployment Guide

This guide covers deploying Fricta as a production-ready SaaS platform.

## Infrastructure Choices
- **Frontend**: Vercel
- **Backend API & Workers**: Railway / Render
- **Database**: Neon PostgreSQL
- **Queue / Cache**: Upstash Redis

## 1. Database (Neon)
1. Create a Neon project.
2. Get the pooled connection string.
3. Run `npx prisma migrate deploy` during the backend build step.

## 2. Redis (Upstash)
1. Create an Upstash Redis database.
2. Get the Redis URI (`rediss://...`).
3. Set this as `REDIS_URL` in the backend environment.

## 3. Backend (Railway)
The backend service must run both the HTTP API and the BullMQ workers. 
1. Connect the repository to Railway.
2. Set the `Root Directory` to `apps/backend` (or use Turborepo root build).
3. Ensure the Build Command is `npm run build` at the monorepo root.
4. Provide all environment variables:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `OPENROUTER_API_KEY`
5. Note: Ensure Playwright browsers are installed (`npx playwright install chromium`) in the build step, or use a Dockerfile based on `mcr.microsoft.com/playwright`.

## 4. Frontend (Vercel)
1. Connect the repository to Vercel.
2. Set the Framework Preset to Vite.
3. Root Directory: `apps/frontend`.
4. Add Environment Variables:
   - `VITE_CLERK_PUBLISHABLE_KEY`
   - `VITE_API_URL` (Pointing to the Railway backend)
