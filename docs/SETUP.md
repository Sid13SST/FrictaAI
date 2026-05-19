# Fricta Setup Guide

## Prerequisites
- Node.js >= 18
- PostgreSQL (Local or Docker)
- Redis (Local or Upstash)
- Playwright

## 1. Install Dependencies
```bash
npm install
```

## 2. Environment Variables
Copy `.env.example` to `.env` and fill in the required keys:
```bash
DATABASE_URL="postgresql://fricta:fricta@localhost:5432/fricta?schema=public"
REDIS_URL="redis://localhost:6379"
OPENROUTER_API_KEY="your_api_key"
VITE_CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
CLERK_SECRET_KEY="your_clerk_secret_key"
```

## 3. Database & Services
Start the local services via Docker Compose:
```bash
docker-compose up -d
```
Then, apply the Prisma schema:
```bash
npm run db:migrate --workspace=@fricta/db
```

## 4. Install Browsers
```bash
npx playwright install chromium
```

## 5. Run the Application
Start the monorepo using Turborepo:
```bash
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
