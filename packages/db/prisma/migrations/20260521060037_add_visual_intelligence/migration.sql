-- CreateTable
CREATE TABLE "VisualFinding" (
    "id" TEXT NOT NULL,
    "workflowSessionId" TEXT NOT NULL,
    "screenshotId" TEXT NOT NULL,
    "findingType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "boundingBoxes" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisualFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisualScore" (
    "id" TEXT NOT NULL,
    "workflowSessionId" TEXT NOT NULL,
    "clarityScore" DOUBLE PRECISION NOT NULL,
    "discoverabilityScore" DOUBLE PRECISION NOT NULL,
    "layoutBalanceScore" DOUBLE PRECISION NOT NULL,
    "navigationScore" DOUBLE PRECISION NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisualScore_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VisualFinding" ADD CONSTRAINT "VisualFinding_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisualFinding" ADD CONSTRAINT "VisualFinding_screenshotId_fkey" FOREIGN KEY ("screenshotId") REFERENCES "WorkflowScreenshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisualScore" ADD CONSTRAINT "VisualScore_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
