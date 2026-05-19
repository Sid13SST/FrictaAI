-- CreateTable
CREATE TABLE "UXSignal" (
    "id" TEXT NOT NULL,
    "workflowSessionId" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UXSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UXRecommendation" (
    "id" TEXT NOT NULL,
    "workflowSessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "severity" TEXT NOT NULL,

    CONSTRAINT "UXRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UXScore" (
    "id" TEXT NOT NULL,
    "workflowSessionId" TEXT NOT NULL,
    "clarityScore" DOUBLE PRECISION NOT NULL,
    "efficiencyScore" DOUBLE PRECISION NOT NULL,
    "smoothnessScore" DOUBLE PRECISION NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "UXScore_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UXSignal" ADD CONSTRAINT "UXSignal_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UXRecommendation" ADD CONSTRAINT "UXRecommendation_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UXScore" ADD CONSTRAINT "UXScore_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
