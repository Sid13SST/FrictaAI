-- CreateTable
CREATE TABLE "WorkflowScreenshot" (
    "id" TEXT NOT NULL,
    "workflowSessionId" TEXT NOT NULL,
    "screenshotType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "thumbnailPath" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stepIndex" INTEGER NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "viewportWidth" INTEGER NOT NULL,
    "viewportHeight" INTEGER NOT NULL,
    "actionContext" TEXT,
    "fileSize" INTEGER NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "WorkflowScreenshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreenshotTimelineEvent" (
    "id" TEXT NOT NULL,
    "workflowSessionId" TEXT NOT NULL,
    "screenshotId" TEXT NOT NULL,
    "actionId" TEXT,
    "thoughtId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventType" TEXT NOT NULL,

    CONSTRAINT "ScreenshotTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WorkflowScreenshot" ADD CONSTRAINT "WorkflowScreenshot_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenshotTimelineEvent" ADD CONSTRAINT "ScreenshotTimelineEvent_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenshotTimelineEvent" ADD CONSTRAINT "ScreenshotTimelineEvent_screenshotId_fkey" FOREIGN KEY ("screenshotId") REFERENCES "WorkflowScreenshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
