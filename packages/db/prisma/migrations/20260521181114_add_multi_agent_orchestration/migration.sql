-- CreateTable
CREATE TABLE "OrchestrationSession" (
    "id" TEXT NOT NULL,
    "workflowSessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrchestrationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentExecution" (
    "id" TEXT NOT NULL,
    "orchestrationSessionId" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IDLE',
    "task" TEXT NOT NULL,
    "result" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DelegationEvent" (
    "id" TEXT NOT NULL,
    "orchestrationSessionId" TEXT NOT NULL,
    "fromAgent" TEXT NOT NULL,
    "toAgent" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DelegationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedContextEvent" (
    "id" TEXT NOT NULL,
    "orchestrationSessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedContextEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrchestrationSession" ADD CONSTRAINT "OrchestrationSession_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_orchestrationSessionId_fkey" FOREIGN KEY ("orchestrationSessionId") REFERENCES "OrchestrationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegationEvent" ADD CONSTRAINT "DelegationEvent_orchestrationSessionId_fkey" FOREIGN KEY ("orchestrationSessionId") REFERENCES "OrchestrationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedContextEvent" ADD CONSTRAINT "SharedContextEvent_orchestrationSessionId_fkey" FOREIGN KEY ("orchestrationSessionId") REFERENCES "OrchestrationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
