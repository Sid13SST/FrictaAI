-- CreateTable
CREATE TABLE "UXFinding" (
    "id" TEXT NOT NULL,
    "workflowSessionId" TEXT NOT NULL,
    "findingType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "personaType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UXFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CognitiveSignal" (
    "id" TEXT NOT NULL,
    "workflowSessionId" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "intensity" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CognitiveSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "traits" JSONB NOT NULL,
    "behaviorModifiers" JSONB NOT NULL,

    CONSTRAINT "PersonaProfile_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UXFinding" ADD CONSTRAINT "UXFinding_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CognitiveSignal" ADD CONSTRAINT "CognitiveSignal_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
