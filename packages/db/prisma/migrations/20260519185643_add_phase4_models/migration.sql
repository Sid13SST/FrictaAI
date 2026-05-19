-- AlterTable
ALTER TABLE "WorkflowSession" ADD COLUMN     "queueJobId" TEXT;

-- CreateTable
CREATE TABLE "WorkflowMetrics" (
    "id" TEXT NOT NULL,
    "workflowSessionId" TEXT NOT NULL,
    "duration" INTEGER,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "tokenUsage" INTEGER NOT NULL DEFAULT 0,
    "completionStatus" TEXT NOT NULL,

    CONSTRAINT "WorkflowMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workflowsRun" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowMetrics_workflowSessionId_key" ON "WorkflowMetrics"("workflowSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformUsage_userId_key" ON "PlatformUsage"("userId");

-- AddForeignKey
ALTER TABLE "WorkflowMetrics" ADD CONSTRAINT "WorkflowMetrics_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformUsage" ADD CONSTRAINT "PlatformUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
