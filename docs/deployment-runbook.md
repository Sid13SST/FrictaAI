# Fricta V1 Deployment Runbook & Operational Guide

This document establishes the official procedures for deploying, verifying, rolling back, and operating Fricta V1 in production environments.

---

## 1. Pre-deployment Checklist

Before initiating any deployment, verify the following gates pass:

- [ ] **CI Pipeline**: Ensure GitHub Actions quality pipeline has completed successfully for the target commit.
- [ ] **Typecheck & Lint**: Confirm no lint or compilation warnings exist locally (`npm run lint` and `npm run typecheck`).
- [ ] **Migrations**: Check if there are new migration directories in `packages/db/prisma/migrations` and confirm they have been reviewed for destructive schema actions.
- [ ] **Backup**: Confirm database snapshots are active (automatic daily backups in Neon/AWS RDS).

---

## 2. Deployment Execution Steps

Fricta utilizes a monorepo architecture. Deployments must occur in the following logical sequence:

### Step 1: Database Migration Deployment
Run the migration script against the production database:
```bash
# Executed via CI/CD task or deployment console
DATABASE_URL="<production-pooled-db-url>" npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma
```

### Step 2: Build Verification
Ensure all packages and apps are built sequentially:
```bash
# Build shared packages
npx turbo run build --filter="./packages/*"

# Build backend and frontend applications
npx turbo run build --filter="@fricta/backend" --filter="@fricta/frontend"
```

### Step 3: Service Deployment
Deploy the backend runtime service (Hono app and BullMQ workers) followed by the frontend assets (Vite/React bundle).
- Ensure target server environment variables (`DATABASE_URL`, `REDIS_URL`, etc.) are pre-configured.

---

## 3. Post-deployment Verification

Verify service readiness immediately after deployment:

### Liveness Verification
```bash
curl -f http://<app-domain>/health/live
# Expected: 200 OK {"status":"healthy"}
```

### Dependency / Readiness Verification
Verify Postgres, Redis, and migration statuses:
```bash
curl -f http://<app-domain>/health/ready
# Expected: 200 OK {"status":"healthy","database":"ok","redis":"ok"}
```

### Version Matching
Confirm the correct version and commit hash are live:
```bash
curl -f http://<app-domain>/api/health/version
# Expected: 200 OK {"version":"1.0.0","commit":"<commit-hash>","environment":"production"}
```

---

## 4. Rollback Procedures

If any verification fails or error rates spike during deployment, invoke the rollback plan immediately:

### A. Application Rollback
Revert the application build to the last known working image or commit hash:
- **Render / Vercel**: Redeploy the previous successful build from the dashboard.
- **Docker**: Revert image tag to the previous working version.

### B. Database Migration Rollback
If a migration was applied but the application was rolled back, evaluate the schema compatibility:
- **Backward-Compatible migrations**: No rollback is needed immediately. Keep the schema intact to avoid downtime.
- **Destructive/Non-compatible migrations**: 
  1. Restore the pre-deployment database snapshot.
  2. If data has been written since deployment, perform selective data syncs or execute customized rollback SQL scripts (under `packages/db/prisma/migrations/<migration_name>/rollback.sql`).

### C. Environment Configuration Rollback
If environment variables were changed:
1. Revert environment keys to their previous configuration values in the provider's dashboard.
2. Trigger an immediate redeploy of the application to pick up the old keys.

---

## 5. Emergency Incident Playbooks

### Case 1: Start Failure (Process Crash Loop)
- **Symptom**: Container crashes immediately after start with exit code 1.
- **Action**: Check server logs. If you see:
  `CRITICAL_STARTUP_ERROR: Missing required environment variables...`
  Ensure all variables listed in the error log are present and correct in the environment configuration dashboard.

### Case 2: Out of Sync Migrations
- **Symptom**: Startup validation logs:
  `MIGRATION_STATE_OUT_OF_SYNC: The database is missing X migrations.`
  - **Action**: Ensure `npx prisma migrate deploy` completed successfully before server startup. If needed, manually trigger the migration command via SSH or cloud console.

### Case 3: Downstream Service Failure (503 Service Unavailable)
- **Symptom**: `/health/ready` returns `503` with database or redis as `failed`.
  - **Action**:
    - **Database Fail**: Verify Neon/RDS connection limits. Check for connection pool depletion or firewall settings.
    - **Redis Fail**: Check Upstash/Redis console for memory saturation or network outages. Restart Redis client or swap endpoints if necessary.
