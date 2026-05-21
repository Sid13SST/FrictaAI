-- CreateTable
CREATE TABLE "AgentFinding" (
    "id" TEXT NOT NULL,
    "agentExecutionId" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "findingType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "correlatedFindings" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentSignal" (
    "id" TEXT NOT NULL,
    "agentExecutionId" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "intensity" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentReasoningTrace" (
    "id" TEXT NOT NULL,
    "agentExecutionId" TEXT NOT NULL,
    "stepType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "evidence" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentReasoningTrace_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AgentFinding" ADD CONSTRAINT "AgentFinding_agentExecutionId_fkey" FOREIGN KEY ("agentExecutionId") REFERENCES "AgentExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentSignal" ADD CONSTRAINT "AgentSignal_agentExecutionId_fkey" FOREIGN KEY ("agentExecutionId") REFERENCES "AgentExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentReasoningTrace" ADD CONSTRAINT "AgentReasoningTrace_agentExecutionId_fkey" FOREIGN KEY ("agentExecutionId") REFERENCES "AgentExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
