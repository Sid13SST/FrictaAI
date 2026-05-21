-- CreateTable
CREATE TABLE "SharedMemoryEvent" (
    "id" TEXT NOT NULL,
    "orchestrationSessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "sourceAgent" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedMemoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrelatedFinding" (
    "id" TEXT NOT NULL,
    "orchestrationSessionId" TEXT NOT NULL,
    "findingIds" JSONB NOT NULL,
    "correlationType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorrelatedFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollaborativeInsight" (
    "id" TEXT NOT NULL,
    "orchestrationSessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "supportingEvidence" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollaborativeInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemorySnapshot" (
    "id" TEXT NOT NULL,
    "orchestrationSessionId" TEXT NOT NULL,
    "snapshotType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemorySnapshot_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SharedMemoryEvent" ADD CONSTRAINT "SharedMemoryEvent_orchestrationSessionId_fkey" FOREIGN KEY ("orchestrationSessionId") REFERENCES "OrchestrationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrelatedFinding" ADD CONSTRAINT "CorrelatedFinding_orchestrationSessionId_fkey" FOREIGN KEY ("orchestrationSessionId") REFERENCES "OrchestrationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollaborativeInsight" ADD CONSTRAINT "CollaborativeInsight_orchestrationSessionId_fkey" FOREIGN KEY ("orchestrationSessionId") REFERENCES "OrchestrationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemorySnapshot" ADD CONSTRAINT "MemorySnapshot_orchestrationSessionId_fkey" FOREIGN KEY ("orchestrationSessionId") REFERENCES "OrchestrationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
