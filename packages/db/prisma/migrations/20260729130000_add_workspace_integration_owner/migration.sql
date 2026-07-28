-- AlterTable
-- Adds the owning-user column for solo-mode WorkspaceIntegration records.
-- No backfill: pre-existing rows never recorded who created them, so
-- historical solo-mode connections are left with userId = NULL. Application
-- code treats a NULL userId in solo mode as belonging to nobody (i.e. it will
-- no longer be returned to any solo user) rather than everybody, which is the
-- safe direction for this gap to fail in. New connections always set it.
ALTER TABLE "WorkspaceIntegration" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "WorkspaceIntegration_workspaceId_userId_provider_idx" ON "WorkspaceIntegration"("workspaceId", "userId", "provider");
