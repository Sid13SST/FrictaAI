-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "workspaceId" TEXT;

-- CreateTable
CREATE TABLE "HistoricalPattern" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "patternType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "frequency" INTEGER NOT NULL,
    "affectedSessions" JSONB NOT NULL,
    "evidenceSummary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HistoricalPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRegression" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workflowPath" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "baseValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL,
    "deltaPercentage" DOUBLE PRECISION NOT NULL,
    "severity" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "evidenceSessionId" TEXT NOT NULL,
    "baseSessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowRegression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaTrend" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "personaType" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "trendDirection" TEXT NOT NULL,
    "averageValue" DOUBLE PRECISION NOT NULL,
    "observation" TEXT NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonaTrend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationalInsight" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "insightCategory" TEXT NOT NULL,
    "metrics" JSONB,
    "impactScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationalInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricalCorrelation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "findingType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sessionCount" INTEGER NOT NULL,
    "correlatedFindingIds" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricalCorrelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdaptiveSignalProfile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "targetPriority" TEXT NOT NULL,
    "reasonTrigger" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdaptiveSignalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "teamId" TEXT,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceRoleId" TEXT,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestigationReview" (
    "id" TEXT NOT NULL,
    "workflowSessionId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "status" TEXT NOT NULL,
    "approvalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestigationReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Annotation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "severity" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Annotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceComment" (
    "id" TEXT NOT NULL,
    "annotationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedLink" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "workspaceId" TEXT,
    "userId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionGrant" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "projectId" TEXT,
    "memberId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "isAllowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermissionGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationProfile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "personaType" TEXT NOT NULL,
    "description" TEXT,
    "traits" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimulationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BehavioralDecision" (
    "id" TEXT NOT NULL,
    "simulationProfileId" TEXT NOT NULL,
    "workflowSessionId" TEXT,
    "stepIndex" INTEGER NOT NULL,
    "actionType" TEXT NOT NULL,
    "targetElement" TEXT NOT NULL,
    "decisionReason" TEXT NOT NULL,
    "confidenceBefore" DOUBLE PRECISION NOT NULL,
    "confidenceAfter" DOUBLE PRECISION NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BehavioralDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExplorationPath" (
    "id" TEXT NOT NULL,
    "simulationProfileId" TEXT NOT NULL,
    "workflowSessionId" TEXT,
    "steps" JSONB NOT NULL,
    "isSuccess" BOOLEAN NOT NULL DEFAULT false,
    "totalFrictionScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExplorationPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HesitationSignal" (
    "id" TEXT NOT NULL,
    "workflowSessionId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "signalType" TEXT NOT NULL,
    "targetElement" TEXT,
    "durationMs" INTEGER NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HesitationSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NavigationConfidenceEvent" (
    "id" TEXT NOT NULL,
    "workflowSessionId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "confidenceValue" DOUBLE PRECISION NOT NULL,
    "contextualDetails" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NavigationConfidenceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrictionReaction" (
    "id" TEXT NOT NULL,
    "workflowSessionId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "reactionType" TEXT NOT NULL,
    "triggerSource" TEXT NOT NULL,
    "intensity" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrictionReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BehavioralReplayEvent" (
    "id" TEXT NOT NULL,
    "simulationProfileId" TEXT NOT NULL,
    "workflowSessionId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "coordinates" JSONB,
    "targetSelector" TEXT,
    "durationMs" INTEGER NOT NULL,
    "metaData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BehavioralReplayEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CognitiveState" (
    "id" TEXT NOT NULL,
    "workflowSessionId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "cognitiveLoad" DOUBLE PRECISION NOT NULL,
    "mentalEffort" DOUBLE PRECISION NOT NULL,
    "informationLoad" DOUBLE PRECISION NOT NULL,
    "interactionLoad" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CognitiveState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfidenceSignal" (
    "id" TEXT NOT NULL,
    "workflowSessionId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "certaintyLevel" TEXT NOT NULL,
    "targetElement" TEXT,
    "evidenceSource" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfidenceSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttentionEvent" (
    "id" TEXT NOT NULL,
    "workflowSessionId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "targetElement" TEXT,
    "visibilityWeight" DOUBLE PRECISION NOT NULL,
    "focusHeat" DOUBLE PRECISION NOT NULL,
    "overloadDetected" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttentionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpectationMismatch" (
    "id" TEXT NOT NULL,
    "workflowSessionId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "expectedAction" TEXT NOT NULL,
    "actualAction" TEXT NOT NULL,
    "mismatchSeverity" TEXT NOT NULL,
    "mismatchCategory" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpectationMismatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionComplexityEvent" (
    "id" TEXT NOT NULL,
    "workflowSessionId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "choiceCount" INTEGER NOT NULL,
    "ambiguityScore" DOUBLE PRECISION NOT NULL,
    "complexityLevel" TEXT NOT NULL,
    "nextActionClarity" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionComplexityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbandonmentRiskSignal" (
    "id" TEXT NOT NULL,
    "workflowSessionId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "riskProbability" DOUBLE PRECISION NOT NULL,
    "triggerSource" TEXT NOT NULL,
    "frictionAccumulated" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbandonmentRiskSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CognitiveTimelineEvent" (
    "id" TEXT NOT NULL,
    "workflowSessionId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "intensity" DOUBLE PRECISION NOT NULL,
    "associatedId" TEXT,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CognitiveTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwarmSession" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startUrl" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwarmSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaExecution" (
    "id" TEXT NOT NULL,
    "swarmSessionId" TEXT NOT NULL,
    "personaType" TEXT NOT NULL,
    "workflowSessionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "frictionScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "stepsCompleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonaExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaComparison" (
    "id" TEXT NOT NULL,
    "swarmSessionId" TEXT NOT NULL,
    "personaA" TEXT NOT NULL,
    "personaB" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "divergenceNotes" TEXT NOT NULL,
    "pathVariance" DOUBLE PRECISION NOT NULL,
    "cognitiveDelta" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonaComparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DivergenceEvent" (
    "id" TEXT NOT NULL,
    "swarmSessionId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "selector" TEXT,
    "personaTypeA" TEXT NOT NULL,
    "actionA" TEXT NOT NULL,
    "personaTypeB" TEXT NOT NULL,
    "actionB" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DivergenceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowSurvivabilityMetric" (
    "id" TEXT NOT NULL,
    "swarmSessionId" TEXT NOT NULL,
    "workflowPath" TEXT NOT NULL,
    "overallCompletionRate" DOUBLE PRECISION NOT NULL,
    "averageSteps" DOUBLE PRECISION NOT NULL,
    "failureClusterCount" INTEGER NOT NULL,
    "abandonmentRiskAverage" DOUBLE PRECISION NOT NULL,
    "failurePoints" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowSurvivabilityMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopulationHeatmap" (
    "id" TEXT NOT NULL,
    "swarmSessionId" TEXT NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "selector" TEXT NOT NULL,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "hoverCount" INTEGER NOT NULL DEFAULT 0,
    "averageHesitationMs" INTEGER NOT NULL DEFAULT 0,
    "averageFrictionScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "attentionWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "cognitiveDensity" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PopulationHeatmap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwarmReplayEvent" (
    "id" TEXT NOT NULL,
    "personaExecutionId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "timestampMs" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "targetSelector" TEXT,
    "coordinates" JSONB,
    "cognitiveLoad" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwarmReplayEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowForecast" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workflowPath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "stabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "averageFriction" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "failureClusterPoints" JSONB NOT NULL,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictiveRiskSignal" (
    "id" TEXT NOT NULL,
    "workflowForecastId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "riskType" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "severity" TEXT NOT NULL,
    "targetSelector" TEXT,
    "contributingSignals" JSONB NOT NULL,
    "evidenceNotes" TEXT NOT NULL,
    "historicalBasis" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictiveRiskSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegressionEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workflowPath" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "baseValue" DOUBLE PRECISION NOT NULL,
    "forecastedValue" DOUBLE PRECISION NOT NULL,
    "driftPercentage" DOUBLE PRECISION NOT NULL,
    "severity" TEXT NOT NULL,
    "contributingFactors" JSONB NOT NULL,
    "historicalBaselineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegressionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricalBaseline" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workflowPath" TEXT NOT NULL,
    "averageSteps" DOUBLE PRECISION NOT NULL,
    "averageFriction" DOUBLE PRECISION NOT NULL,
    "successRate" DOUBLE PRECISION NOT NULL,
    "cognitiveLoadAverage" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricalBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurvivabilityForecast" (
    "id" TEXT NOT NULL,
    "workflowForecastId" TEXT NOT NULL,
    "personaType" TEXT NOT NULL,
    "predictedSurvivalRate" DOUBLE PRECISION NOT NULL,
    "estimatedStepsToAbandon" DOUBLE PRECISION NOT NULL,
    "primaryAbandonmentTrigger" TEXT NOT NULL,
    "riskFactors" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurvivabilityForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbandonmentPrediction" (
    "id" TEXT NOT NULL,
    "workflowForecastId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "abandonmentProbability" DOUBLE PRECISION NOT NULL,
    "triggerSource" TEXT NOT NULL,
    "cognitiveLoadEscalation" DOUBLE PRECISION NOT NULL,
    "confidenceCollapseProbability" DOUBLE PRECISION NOT NULL,
    "retryDensityImpact" DOUBLE PRECISION NOT NULL,
    "hesitationAccumulationMs" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbandonmentPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictiveTimelineEvent" (
    "id" TEXT NOT NULL,
    "workflowForecastId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "timeOffsetMs" INTEGER NOT NULL,
    "predictedIntensity" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictiveTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedInvestigation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "workflowSessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedInvestigation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestigationComment" (
    "id" TEXT NOT NULL,
    "sharedInvestigationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestigationComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceProject" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceActivity" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceRole" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspacePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "isAllowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspacePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspacePolicy" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspacePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestigationAccess" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sharedInvestigationId" TEXT NOT NULL,
    "accessorType" TEXT NOT NULL,
    "accessorId" TEXT,
    "canRead" BOOLEAN NOT NULL DEFAULT true,
    "canWrite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestigationAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplayAccessScope" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "workflowSessionId" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "allowedRoles" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReplayAccessScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedAccessGrant" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "granteeId" TEXT,
    "granteeEmail" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceSecurityEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceSecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutiveReport" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "stabilityScore" DOUBLE PRECISION NOT NULL,
    "completionRate" DOUBLE PRECISION NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutiveReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportTemplate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "layoutType" TEXT NOT NULL,
    "structure" JSONB NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportExport" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "filePath" TEXT,
    "metadata" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedReport" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "recipientEmail" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportEvidenceLink" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportEvidenceLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportDistributionEvent" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "sentById" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportDistributionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceInsightDigest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "digestPeriod" TEXT NOT NULL,
    "metricsSummary" JSONB NOT NULL,
    "topRisks" JSONB NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceInsightDigest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplayAuditLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "workflowSessionId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReplayAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestigationAuditLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "sharedInvestigationId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestigationAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernancePolicyEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "userId" TEXT,
    "policyKey" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernancePolicyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceRetentionRecord" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "retentionDays" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceRetentionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessTraceRecord" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "userId" TEXT,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessTraceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceSecurityAlert" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "userId" TEXT,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceSecurityAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrossSessionPattern" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "projectId" TEXT NOT NULL,
    "patternName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "supportingData" JSONB NOT NULL,
    "severity" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrossSessionPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricalRegression" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "projectId" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "baseVersion" TEXT NOT NULL,
    "compareVersion" TEXT NOT NULL,
    "baseValue" DOUBLE PRECISION NOT NULL,
    "compareValue" DOUBLE PRECISION NOT NULL,
    "changePercent" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "triggerSignals" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricalRegression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationalTrend" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "trendType" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "scoreValue" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationalTrend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaEvolution" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "projectId" TEXT NOT NULL,
    "personaName" TEXT NOT NULL,
    "adaptationRate" DOUBLE PRECISION NOT NULL,
    "frictionIndex" DOUBLE PRECISION NOT NULL,
    "successRate" DOUBLE PRECISION NOT NULL,
    "fatigueTrend" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonaEvolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStabilityHistory" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "projectId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stabilityScore" DOUBLE PRECISION NOT NULL,
    "completionRate" DOUBLE PRECISION NOT NULL,
    "stepAverage" DOUBLE PRECISION NOT NULL,
    "complexityRank" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowStabilityHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LongitudinalSignal" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "projectId" TEXT NOT NULL,
    "elementSelector" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL,
    "averageSeverity" DOUBLE PRECISION NOT NULL,
    "historicalBasis" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LongitudinalSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionCorrelation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "projectId" TEXT NOT NULL,
    "sessionAId" TEXT NOT NULL,
    "sessionBId" TEXT NOT NULL,
    "similarity" DOUBLE PRECISION NOT NULL,
    "sharedFriction" JSONB NOT NULL,
    "deltaNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionCorrelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UXMemorySnapshot" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "projectId" TEXT NOT NULL,
    "snapshotName" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "patternCount" INTEGER NOT NULL,
    "activeRiskCount" INTEGER NOT NULL,
    "trendHealth" DOUBLE PRECISION NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UXMemorySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UXFailurePrediction" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "projectId" TEXT NOT NULL,
    "workflowPath" TEXT NOT NULL,
    "predictedFailureType" TEXT NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL,
    "severity" TEXT NOT NULL,
    "targetSelector" TEXT,
    "estimatedSteps" INTEGER,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UXFailurePrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CognitiveRiskSignal" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "projectId" TEXT NOT NULL,
    "personaType" TEXT NOT NULL,
    "riskType" TEXT NOT NULL,
    "predictedLoad" DOUBLE PRECISION NOT NULL,
    "estimatedStep" INTEGER NOT NULL,
    "mitigationNotes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CognitiveRiskSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForecastEvidence" (
    "id" TEXT NOT NULL,
    "predictionId" TEXT NOT NULL,
    "sessionRefId" TEXT,
    "findingRefId" TEXT,
    "evidenceDescription" TEXT NOT NULL,
    "confidenceWeight" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForecastEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRiskScore" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "projectId" TEXT NOT NULL,
    "workflowPath" TEXT NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "onboardingFailureRate" DOUBLE PRECISION NOT NULL,
    "frictionEscalationRate" DOUBLE PRECISION NOT NULL,
    "stabilityIndex" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowRiskScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictiveMemorySignal" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "projectId" TEXT NOT NULL,
    "signalKey" TEXT NOT NULL,
    "signalValue" DOUBLE PRECISION NOT NULL,
    "lastComputed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictiveMemorySignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedesignRecommendation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "projectId" TEXT NOT NULL,
    "targetElement" TEXT,
    "workflowPath" TEXT NOT NULL,
    "recommendationType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "proposedChange" TEXT NOT NULL,
    "impactScore" DOUBLE PRECISION NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RedesignRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationEvidence" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "sessionRefId" TEXT,
    "findingRefId" TEXT,
    "evidenceNotes" TEXT NOT NULL,
    "metricDriftValue" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UXOptimizationSuggestion" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "projectId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "effortEstimate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UXOptimizationSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CognitiveRemediation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "projectId" TEXT NOT NULL,
    "targetStep" INTEGER NOT NULL,
    "loadType" TEXT NOT NULL,
    "remediationPlan" TEXT NOT NULL,
    "complexityReduction" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CognitiveRemediation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowOptimization" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "projectId" TEXT NOT NULL,
    "workflowPath" TEXT NOT NULL,
    "stepCountReduction" INTEGER NOT NULL,
    "expectedSurvivalGain" DOUBLE PRECISION NOT NULL,
    "remediationStrategy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowOptimization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationImpactForecast" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "beforeValue" DOUBLE PRECISION NOT NULL,
    "afterValue" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationImpactForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedesignTrace" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "actionNodeIndex" INTEGER NOT NULL,
    "actionSelector" TEXT NOT NULL,
    "screenshotPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RedesignTrace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationMemorySignal" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "projectId" TEXT NOT NULL,
    "signalKey" TEXT NOT NULL,
    "signalValue" DOUBLE PRECISION NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptimizationMemorySignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutonomousOptimizationRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "projectId" TEXT NOT NULL,
    "workflowPath" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recommendationId" TEXT,
    "remediationPlan" TEXT NOT NULL,
    "targetSelector" TEXT,
    "overallSafetyScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutonomousOptimizationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationSimulation" (
    "id" TEXT NOT NULL,
    "optimizationRunId" TEXT NOT NULL,
    "personaType" TEXT NOT NULL,
    "simulatedSurvivalGain" DOUBLE PRECISION NOT NULL,
    "simulatedClarityGain" DOUBLE PRECISION NOT NULL,
    "cognitiveLoadBefore" DOUBLE PRECISION NOT NULL,
    "cognitiveLoadAfter" DOUBLE PRECISION NOT NULL,
    "verdict" TEXT NOT NULL,
    "simulatedLogs" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptimizationSimulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdaptationRule" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "projectId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "triggerSelector" TEXT NOT NULL,
    "thresholdMetric" TEXT NOT NULL,
    "thresholdValue" DOUBLE PRECISION NOT NULL,
    "mitigationValue" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdaptationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationApproval" (
    "id" TEXT NOT NULL,
    "optimizationRunId" TEXT NOT NULL,
    "reviewedById" TEXT,
    "roleScope" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptimizationApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationRollback" (
    "id" TEXT NOT NULL,
    "optimizationRunId" TEXT NOT NULL,
    "initiatedById" TEXT,
    "rollbackReason" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptimizationRollback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutonomousDecisionTrace" (
    "id" TEXT NOT NULL,
    "optimizationRunId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "decisionNode" TEXT NOT NULL,
    "outcomeDescription" TEXT NOT NULL,
    "evidenceRefId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutonomousDecisionTrace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationGovernanceEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "policyPassed" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptimizationGovernanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationSafetySignal" (
    "id" TEXT NOT NULL,
    "optimizationRunId" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "metricValue" DOUBLE PRECISION NOT NULL,
    "thresholdLimit" DOUBLE PRECISION NOT NULL,
    "policyPassed" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptimizationSafetySignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceIntegration" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "providerUserId" TEXT,
    "providerOrgId" TEXT,
    "scopes" TEXT,
    "metadata" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT,

    CONSTRAINT "WorkspaceIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationConnection" (
    "id" TEXT NOT NULL,
    "workspaceIntegrationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalName" TEXT NOT NULL,
    "externalUrl" TEXT,
    "connectionType" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationEvent" (
    "id" TEXT NOT NULL,
    "workspaceIntegrationId" TEXT,
    "workspaceId" TEXT,
    "provider" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "deduplicationKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "IntegrationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplayLink" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "connectionId" TEXT,
    "workflowSessionId" TEXT,
    "provider" TEXT NOT NULL,
    "externalResourceId" TEXT NOT NULL,
    "externalResourceUrl" TEXT,
    "externalResourceName" TEXT,
    "linkType" TEXT NOT NULL,
    "uxFindingId" TEXT,
    "evidenceSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReplayLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceAttachment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "connectionId" TEXT,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "attachmentType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "evidenceUrl" TEXT,
    "severity" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalReference" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "refType" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalKey" TEXT,
    "externalUrl" TEXT,
    "title" TEXT,
    "status" TEXT,
    "replayLineage" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" TEXT NOT NULL,
    "workspaceIntegrationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "payload" JSONB,
    "result" JSONB,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationAuditEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "userId" TEXT,
    "provider" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "resourceId" TEXT,
    "policyPassed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeploymentRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "commitHash" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "deploymentUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "survivabilityScore" DOUBLE PRECISION,
    "riskLevel" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeploymentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplayExecution" (
    "id" TEXT NOT NULL,
    "deploymentRunId" TEXT NOT NULL,
    "workflowSessionId" TEXT,
    "workflowPath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "survivabilityRate" DOUBLE PRECISION,
    "cognitiveLoad" DOUBLE PRECISION,
    "frictionScore" DOUBLE PRECISION,
    "stepsCompleted" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReplayExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreviewEnvironment" (
    "id" TEXT NOT NULL,
    "deploymentRunId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "prNumber" TEXT,
    "isTemporary" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreviewEnvironment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PullRequestIntelligence" (
    "id" TEXT NOT NULL,
    "deploymentRunId" TEXT NOT NULL,
    "prNumber" TEXT NOT NULL,
    "prTitle" TEXT NOT NULL,
    "sourceBranch" TEXT NOT NULL,
    "targetBranch" TEXT NOT NULL,
    "uxRegressionCount" INTEGER NOT NULL DEFAULT 0,
    "cognitiveDrift" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "survivabilityDelta" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "summary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PullRequestIntelligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegressionAnalysis" (
    "id" TEXT NOT NULL,
    "deploymentRunId" TEXT NOT NULL,
    "workflowPath" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "baseValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL,
    "delta" DOUBLE PRECISION NOT NULL,
    "severity" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegressionAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeploymentRiskSignal" (
    "id" TEXT NOT NULL,
    "deploymentRunId" TEXT NOT NULL,
    "riskType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetSelector" TEXT,
    "evidenceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeploymentRiskSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildCorrelation" (
    "id" TEXT NOT NULL,
    "deploymentRunId" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "jobId" TEXT,
    "commitMessage" TEXT,
    "author" TEXT,
    "duration" INTEGER,
    "logUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildCorrelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseTimelineEvent" (
    "id" TEXT NOT NULL,
    "deploymentRunId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventTitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReleaseTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedReplaySession" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workflowSessionId" TEXT NOT NULL,
    "shareToken" TEXT NOT NULL,
    "sharedWithEmail" TEXT,
    "notes" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedReplaySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestigationThread" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "workflowSessionId" TEXT,
    "uxFindingId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestigationThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplayAnnotation" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "author" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReplayAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollaborationEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "roomType" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "payload" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollaborationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalAlert" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "workflowSessionId" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationalAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertEscalation" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertEscalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigestSubscription" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigestSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMentionEvent" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "mentionedUser" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMentionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scopes" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceAccount" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'DEVELOPER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "statusCode" INTEGER,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiUsageRecord" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiUsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "tokens" DOUBLE PRECISION NOT NULL,
    "lastRefilled" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeveloperApplication" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "redirectUris" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeveloperApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAuditEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "ipAddress" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveSession" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "userId" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "device" TEXT,
    "ipAddress" TEXT,
    "location" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelemetryEvent" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelemetryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionSignal" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NavigationEvent" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "fromUrl" TEXT NOT NULL,
    "toUrl" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NavigationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelemetryInteractionEvent" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "elementType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelemetryInteractionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrictionSignal" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "frictionType" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "details" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrictionSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionHeartbeat" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "activeDurationSeconds" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionHeartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelemetryAuditRecord" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "liveSessionId" TEXT,
    "actionType" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelemetryAuditRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UXAnomaly" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "anomalyType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UXAnomaly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BehavioralPattern" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "patternType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "sessionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BehavioralPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurvivabilityMetric" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "targetWorkflow" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurvivabilityMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionBaseline" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "baselineType" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "expectedValue" DOUBLE PRECISION NOT NULL,
    "standardDeviation" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnomalyEvidence" (
    "id" TEXT NOT NULL,
    "anomalyId" TEXT,
    "patternId" TEXT,
    "liveSessionId" TEXT,
    "evidenceType" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnomalyEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrelatedBehavior" (
    "id" TEXT NOT NULL,
    "anomalyId" TEXT,
    "patternId" TEXT,
    "correlationType" TEXT NOT NULL,
    "correlationKey" TEXT NOT NULL,
    "coefficient" DOUBLE PRECISION NOT NULL,
    "evidenceDetails" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorrelatedBehavior_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskEscalation" (
    "id" TEXT NOT NULL,
    "anomalyId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "escalationTrigger" TEXT NOT NULL,
    "notifiedChannels" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskEscalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntelligenceAlert" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntelligenceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UXExperiment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "targetMetric" TEXT NOT NULL,
    "targetWorkflow" TEXT,
    "evaluationWindow" INTEGER NOT NULL DEFAULT 14,
    "startedAt" TIMESTAMP(3),
    "concludedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UXExperiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentVariant" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isControl" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "changeDetails" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationHypothesis" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "experimentId" TEXT,
    "problemStatement" TEXT NOT NULL,
    "supportingEvidence" TEXT NOT NULL,
    "expectedImprovement" TEXT NOT NULL,
    "measurementStrategy" TEXT NOT NULL,
    "riskAssessment" TEXT NOT NULL,
    "evaluationWindow" INTEGER NOT NULL DEFAULT 14,
    "successThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptimizationHypothesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentOutcome" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "conclusion" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "baselineMetricValue" DOUBLE PRECISION NOT NULL,
    "outcomeMetricValue" DOUBLE PRECISION NOT NULL,
    "deltaPercent" DOUBLE PRECISION NOT NULL,
    "unexpectedEffects" TEXT,
    "evaluationNotes" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationImpact" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "recommendationId" TEXT,
    "recommendationType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "adoptionStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "adoptedAt" TIMESTAMP(3),
    "baselineSurvivability" DOUBLE PRECISION,
    "currentSurvivability" DOUBLE PRECISION,
    "survivabilityDelta" DOUBLE PRECISION,
    "baselineFriction" DOUBLE PRECISION,
    "currentFriction" DOUBLE PRECISION,
    "frictionDelta" DOUBLE PRECISION,
    "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendationImpact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationMemory" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "memoryType" TEXT NOT NULL,
    "patternKey" TEXT NOT NULL,
    "patternSummary" TEXT NOT NULL,
    "outcomeType" TEXT NOT NULL,
    "metricImpacted" TEXT NOT NULL,
    "deltaAchieved" DOUBLE PRECISION,
    "experimentId" TEXT,
    "evidenceDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptimizationMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImprovementBaseline" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "experimentId" TEXT,
    "metricName" TEXT NOT NULL,
    "baselineValue" DOUBLE PRECISION NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scopeKey" TEXT,

    CONSTRAINT "ImprovementBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentEvidence" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "referenceId" TEXT,
    "details" JSONB NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationPlan" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptimizationPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationOpportunity" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "opportunityType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "impactPotential" DOUBLE PRECISION NOT NULL,
    "userReach" DOUBLE PRECISION NOT NULL,
    "severity" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "survivabilityGain" DOUBLE PRECISION NOT NULL,
    "implementationComplexity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptimizationOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationForecast" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "planId" TEXT,
    "metricName" TEXT NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL,
    "forecastedValue" DOUBLE PRECISION NOT NULL,
    "confidenceIntervalLower" DOUBLE PRECISION NOT NULL,
    "confidenceIntervalUpper" DOUBLE PRECISION NOT NULL,
    "uncertaintyDetails" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptimizationForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationRoadmap" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptimizationRoadmap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InitiativeRecommendation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "planId" TEXT,
    "opportunityId" TEXT,
    "roadmapId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impactArea" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "complexity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InitiativeRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationDecision" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "comments" TEXT,
    "externalReference" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationOutcome" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "baselineValue" DOUBLE PRECISION NOT NULL,
    "actualValue" DOUBLE PRECISION NOT NULL,
    "deltaPercent" DOUBLE PRECISION NOT NULL,
    "verdict" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptimizationOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForecastAccuracyRecord" (
    "id" TEXT NOT NULL,
    "forecastId" TEXT NOT NULL,
    "actualValue" DOUBLE PRECISION NOT NULL,
    "errorPercent" DOUBLE PRECISION NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForecastAccuracyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategicObjective" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetMetric" TEXT,
    "targetValue" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategicObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductInitiative" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "objectiveId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "owner" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "strategicScore" DOUBLE PRECISION NOT NULL,
    "userImpactScore" DOUBLE PRECISION NOT NULL,
    "survivabilityScore" DOUBLE PRECISION NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "effortScore" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "complexity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "targetQuarter" TEXT NOT NULL DEFAULT '2026-Q3',
    "roadmapId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductInitiative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InitiativeEvidence" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InitiativeEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductRoadmap" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductRoadmap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategicRisk" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "riskType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "mitigationPlan" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategicRisk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityScore" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "title" TEXT NOT NULL,
    "reachScore" DOUBLE PRECISION NOT NULL,
    "impactScore" DOUBLE PRECISION NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "effortScore" DOUBLE PRECISION NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutiveMetric" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "targetValue" DOUBLE PRECISION,
    "trend" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutiveMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductHealthSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "productHealthScore" DOUBLE PRECISION NOT NULL,
    "strategicRiskScore" DOUBLE PRECISION NOT NULL,
    "uxHealthScore" DOUBLE PRECISION NOT NULL,
    "opportunityPipelineCount" INTEGER NOT NULL,
    "activeInitiativesCount" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductHealthSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductKPI" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "kpiType" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL,
    "targetValue" DOUBLE PRECISION,
    "owner" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductKPI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KPIHistory" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KPIHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOutcome" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "initiativeId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "verdict" TEXT NOT NULL DEFAULT 'NEUTRAL',
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutcomeEvidence" (
    "id" TEXT NOT NULL,
    "outcomeId" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutcomeEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InitiativeImpact" (
    "id" TEXT NOT NULL,
    "outcomeId" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "correlationValue" DOUBLE PRECISION NOT NULL,
    "baselineValue" DOUBLE PRECISION NOT NULL,
    "postValue" DOUBLE PRECISION NOT NULL,
    "deltaPercent" DOUBLE PRECISION NOT NULL,
    "contributionAnalysis" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InitiativeImpact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductHealthScore" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "productScore" DOUBLE PRECISION NOT NULL,
    "uxScore" DOUBLE PRECISION NOT NULL,
    "strategicScore" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductHealthScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutcomeBaseline" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutcomeBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KPIForecast" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "projectedValue" DOUBLE PRECISION NOT NULL,
    "confidenceLower" DOUBLE PRECISION NOT NULL,
    "confidenceUpper" DOUBLE PRECISION NOT NULL,
    "targetQuarter" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KPIForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioObjective" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,

    CONSTRAINT "PortfolioObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlignmentRecord" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "alignmentScore" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ALIGNED',
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlignmentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategicGap" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "gapType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategicGap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DependencyRecord" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceInitiativeId" TEXT NOT NULL,
    "targetInitiativeId" TEXT NOT NULL,
    "dependencyType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DependencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioHealthSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "alignmentScore" DOUBLE PRECISION NOT NULL,
    "riskIndex" DOUBLE PRECISION NOT NULL,
    "coverageScore" DOUBLE PRECISION NOT NULL,
    "healthRating" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioHealthSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentAllocation" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "budgetAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestmentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationalRisk" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impactArea" TEXT NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL,
    "impactScore" DOUBLE PRECISION NOT NULL,
    "propagatedRisk" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'MONITORED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationalRisk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutiveRecommendation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "recommendationType" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutiveRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionRecord" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceReview" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reviewType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "reviewedBy" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernanceReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategicRiskRecord" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "riskSource" TEXT NOT NULL,
    "sourceId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL,
    "impact" DOUBLE PRECISION NOT NULL,
    "compositeScore" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'MONITORED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategicRiskRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutiveHealthSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "productHealth" DOUBLE PRECISION NOT NULL,
    "strategicHealth" DOUBLE PRECISION NOT NULL,
    "portfolioHealth" DOUBLE PRECISION NOT NULL,
    "uxHealth" DOUBLE PRECISION NOT NULL,
    "kpiHealth" DOUBLE PRECISION NOT NULL,
    "compositeHealth" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutiveHealthSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernancePolicyReview" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "policyName" TEXT NOT NULL,
    "complianceRate" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PASSED',
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernancePolicyReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutiveEvidence" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutiveEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionOutcome" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "expectedDelta" DOUBLE PRECISION NOT NULL,
    "actualDelta" DOUBLE PRECISION,
    "measuredAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "DecisionOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeEntity" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeRelationship" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceLink" (
    "id" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GraphSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "entityCount" INTEGER NOT NULL,
    "relationCount" INTEGER NOT NULL,
    "snapshotData" JSONB NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GraphSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelationshipEvidence" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidenceGain" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelationshipEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryRecord" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "entityId" TEXT,
    "discoveryType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoveryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeTimeline" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "entityId" TEXT,
    "eventType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GraphHealthRecord" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "density" DOUBLE PRECISION NOT NULL,
    "connectivity" DOUBLE PRECISION NOT NULL,
    "orphanCount" INTEGER NOT NULL,
    "stabilityIndex" DOUBLE PRECISION NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GraphHealthRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningPattern" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "patternName" TEXT NOT NULL,
    "patternType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricalCase" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "caseType" TEXT NOT NULL,
    "outcomeValue" DOUBLE PRECISION,
    "recommendationId" TEXT,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "failureRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HistoricalCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuccessPattern" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "winCategory" TEXT NOT NULL,
    "impactScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuccessPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FailurePattern" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mistakeType" TEXT NOT NULL,
    "impactScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FailurePattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurrenceRecord" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "patternId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurrenceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationalLesson" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "lessonType" TEXT NOT NULL,
    "impactScore" DOUBLE PRECISION NOT NULL,
    "evidence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationalLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatternEvidence" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "patternId" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatternEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "patternCount" INTEGER NOT NULL,
    "lessonCount" INTEGER NOT NULL,
    "snapshotData" JSONB NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForecastRecord" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "forecastType" TEXT NOT NULL,
    "targetEntityId" TEXT NOT NULL,
    "targetEntityName" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL,
    "projectedValue" DOUBLE PRECISION NOT NULL,
    "lowerBound" DOUBLE PRECISION NOT NULL,
    "upperBound" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForecastRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategicForecastEvidence" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "forecastId" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategicForecastEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioAnalysis" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scenarioType" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScenarioAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioOutcome" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "projectedValue" DOUBLE PRECISION NOT NULL,
    "deltaPercent" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScenarioOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForecastAssumption" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "forecastId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "validityStatus" TEXT NOT NULL,
    "impactLevel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForecastAssumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergingRisk" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "riskType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" DOUBLE PRECISION NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL,
    "triggerCondition" TEXT NOT NULL,
    "isDetected" BOOLEAN NOT NULL DEFAULT false,
    "detectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergingRisk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfidenceRecord" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "forecastId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "explanation" TEXT NOT NULL,
    "factors" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfidenceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForecastSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "forecastCount" INTEGER NOT NULL,
    "riskCount" INTEGER NOT NULL,
    "snapshotData" JSONB NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForecastSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionalLesson" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "lessonType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "impactScore" DOUBLE PRECISION NOT NULL,
    "occurrences" INTEGER NOT NULL,
    "timespanMonths" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstitutionalLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationalPrinciple" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "principleType" TEXT NOT NULL,
    "supportRate" DOUBLE PRECISION NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationalPrinciple_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WisdomRecord" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "wisdomData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WisdomRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WisdomEvidence" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WisdomEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricalSynthesis" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "synthesisType" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HistoricalSynthesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LongTermTrend" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "changePercent" DOUBLE PRECISION NOT NULL,
    "timespanDays" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LongTermTrend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategicLearning" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "learningType" TEXT NOT NULL,
    "impactRating" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategicLearning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WisdomSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "lessonsCount" INTEGER NOT NULL,
    "principlesCount" INTEGER NOT NULL,
    "snapshotData" JSONB NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WisdomSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SharedLink_token_key" ON "SharedLink"("token");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvite_token_key" ON "WorkspaceInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "SharedReport_token_key" ON "SharedReport"("token");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationEvent_deduplicationKey_key" ON "IntegrationEvent"("deduplicationKey");

-- CreateIndex
CREATE UNIQUE INDEX "SharedReplaySession_shareToken_key" ON "SharedReplaySession"("shareToken");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitBucket_key_key" ON "RateLimitBucket"("key");

-- CreateIndex
CREATE UNIQUE INDEX "DeveloperApplication_clientId_key" ON "DeveloperApplication"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveSession_sessionKey_key" ON "LiveSession"("sessionKey");

-- CreateIndex
CREATE UNIQUE INDEX "OptimizationHypothesis_experimentId_key" ON "OptimizationHypothesis"("experimentId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricalPattern" ADD CONSTRAINT "HistoricalPattern_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRegression" ADD CONSTRAINT "WorkflowRegression_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaTrend" ADD CONSTRAINT "PersonaTrend_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationalInsight" ADD CONSTRAINT "OrganizationalInsight_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricalCorrelation" ADD CONSTRAINT "HistoricalCorrelation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdaptiveSignalProfile" ADD CONSTRAINT "AdaptiveSignalProfile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceRoleId_fkey" FOREIGN KEY ("workspaceRoleId") REFERENCES "WorkspaceRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationReview" ADD CONSTRAINT "InvestigationReview_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationReview" ADD CONSTRAINT "InvestigationReview_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceComment" ADD CONSTRAINT "EvidenceComment_annotationId_fkey" FOREIGN KEY ("annotationId") REFERENCES "Annotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceComment" ADD CONSTRAINT "EvidenceComment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedLink" ADD CONSTRAINT "SharedLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedLink" ADD CONSTRAINT "SharedLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionGrant" ADD CONSTRAINT "PermissionGrant_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "WorkspaceMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationProfile" ADD CONSTRAINT "SimulationProfile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehavioralDecision" ADD CONSTRAINT "BehavioralDecision_simulationProfileId_fkey" FOREIGN KEY ("simulationProfileId") REFERENCES "SimulationProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehavioralDecision" ADD CONSTRAINT "BehavioralDecision_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExplorationPath" ADD CONSTRAINT "ExplorationPath_simulationProfileId_fkey" FOREIGN KEY ("simulationProfileId") REFERENCES "SimulationProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExplorationPath" ADD CONSTRAINT "ExplorationPath_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HesitationSignal" ADD CONSTRAINT "HesitationSignal_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NavigationConfidenceEvent" ADD CONSTRAINT "NavigationConfidenceEvent_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrictionReaction" ADD CONSTRAINT "FrictionReaction_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehavioralReplayEvent" ADD CONSTRAINT "BehavioralReplayEvent_simulationProfileId_fkey" FOREIGN KEY ("simulationProfileId") REFERENCES "SimulationProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehavioralReplayEvent" ADD CONSTRAINT "BehavioralReplayEvent_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CognitiveState" ADD CONSTRAINT "CognitiveState_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfidenceSignal" ADD CONSTRAINT "ConfidenceSignal_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttentionEvent" ADD CONSTRAINT "AttentionEvent_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpectationMismatch" ADD CONSTRAINT "ExpectationMismatch_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionComplexityEvent" ADD CONSTRAINT "DecisionComplexityEvent_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbandonmentRiskSignal" ADD CONSTRAINT "AbandonmentRiskSignal_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CognitiveTimelineEvent" ADD CONSTRAINT "CognitiveTimelineEvent_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwarmSession" ADD CONSTRAINT "SwarmSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaExecution" ADD CONSTRAINT "PersonaExecution_swarmSessionId_fkey" FOREIGN KEY ("swarmSessionId") REFERENCES "SwarmSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaExecution" ADD CONSTRAINT "PersonaExecution_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaComparison" ADD CONSTRAINT "PersonaComparison_swarmSessionId_fkey" FOREIGN KEY ("swarmSessionId") REFERENCES "SwarmSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DivergenceEvent" ADD CONSTRAINT "DivergenceEvent_swarmSessionId_fkey" FOREIGN KEY ("swarmSessionId") REFERENCES "SwarmSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowSurvivabilityMetric" ADD CONSTRAINT "WorkflowSurvivabilityMetric_swarmSessionId_fkey" FOREIGN KEY ("swarmSessionId") REFERENCES "SwarmSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopulationHeatmap" ADD CONSTRAINT "PopulationHeatmap_swarmSessionId_fkey" FOREIGN KEY ("swarmSessionId") REFERENCES "SwarmSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwarmReplayEvent" ADD CONSTRAINT "SwarmReplayEvent_personaExecutionId_fkey" FOREIGN KEY ("personaExecutionId") REFERENCES "PersonaExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowForecast" ADD CONSTRAINT "WorkflowForecast_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictiveRiskSignal" ADD CONSTRAINT "PredictiveRiskSignal_workflowForecastId_fkey" FOREIGN KEY ("workflowForecastId") REFERENCES "WorkflowForecast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegressionEvent" ADD CONSTRAINT "RegressionEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegressionEvent" ADD CONSTRAINT "RegressionEvent_historicalBaselineId_fkey" FOREIGN KEY ("historicalBaselineId") REFERENCES "HistoricalBaseline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricalBaseline" ADD CONSTRAINT "HistoricalBaseline_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurvivabilityForecast" ADD CONSTRAINT "SurvivabilityForecast_workflowForecastId_fkey" FOREIGN KEY ("workflowForecastId") REFERENCES "WorkflowForecast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbandonmentPrediction" ADD CONSTRAINT "AbandonmentPrediction_workflowForecastId_fkey" FOREIGN KEY ("workflowForecastId") REFERENCES "WorkflowForecast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictiveTimelineEvent" ADD CONSTRAINT "PredictiveTimelineEvent_workflowForecastId_fkey" FOREIGN KEY ("workflowForecastId") REFERENCES "WorkflowForecast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedInvestigation" ADD CONSTRAINT "SharedInvestigation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedInvestigation" ADD CONSTRAINT "SharedInvestigation_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedInvestigation" ADD CONSTRAINT "SharedInvestigation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationComment" ADD CONSTRAINT "InvestigationComment_sharedInvestigationId_fkey" FOREIGN KEY ("sharedInvestigationId") REFERENCES "SharedInvestigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationComment" ADD CONSTRAINT "InvestigationComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceProject" ADD CONSTRAINT "WorkspaceProject_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceProject" ADD CONSTRAINT "WorkspaceProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceActivity" ADD CONSTRAINT "WorkspaceActivity_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceActivity" ADD CONSTRAINT "WorkspaceActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspacePermission" ADD CONSTRAINT "WorkspacePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "WorkspaceRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspacePolicy" ADD CONSTRAINT "WorkspacePolicy_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationAccess" ADD CONSTRAINT "InvestigationAccess_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationAccess" ADD CONSTRAINT "InvestigationAccess_sharedInvestigationId_fkey" FOREIGN KEY ("sharedInvestigationId") REFERENCES "SharedInvestigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplayAccessScope" ADD CONSTRAINT "ReplayAccessScope_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplayAccessScope" ADD CONSTRAINT "ReplayAccessScope_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedAccessGrant" ADD CONSTRAINT "SharedAccessGrant_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSecurityEvent" ADD CONSTRAINT "WorkspaceSecurityEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSecurityEvent" ADD CONSTRAINT "WorkspaceSecurityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveReport" ADD CONSTRAINT "ExecutiveReport_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveReport" ADD CONSTRAINT "ExecutiveReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveReport" ADD CONSTRAINT "ExecutiveReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportTemplate" ADD CONSTRAINT "ReportTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportExport" ADD CONSTRAINT "ReportExport_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ExecutiveReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportExport" ADD CONSTRAINT "ReportExport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedReport" ADD CONSTRAINT "SharedReport_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ExecutiveReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedReport" ADD CONSTRAINT "SharedReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportEvidenceLink" ADD CONSTRAINT "ReportEvidenceLink_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ExecutiveReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportDistributionEvent" ADD CONSTRAINT "ReportDistributionEvent_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ExecutiveReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportDistributionEvent" ADD CONSTRAINT "ReportDistributionEvent_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInsightDigest" ADD CONSTRAINT "WorkspaceInsightDigest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplayAuditLog" ADD CONSTRAINT "ReplayAuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplayAuditLog" ADD CONSTRAINT "ReplayAuditLog_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplayAuditLog" ADD CONSTRAINT "ReplayAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationAuditLog" ADD CONSTRAINT "InvestigationAuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationAuditLog" ADD CONSTRAINT "InvestigationAuditLog_sharedInvestigationId_fkey" FOREIGN KEY ("sharedInvestigationId") REFERENCES "SharedInvestigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationAuditLog" ADD CONSTRAINT "InvestigationAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernancePolicyEvent" ADD CONSTRAINT "GovernancePolicyEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernancePolicyEvent" ADD CONSTRAINT "GovernancePolicyEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRetentionRecord" ADD CONSTRAINT "ComplianceRetentionRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessTraceRecord" ADD CONSTRAINT "AccessTraceRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessTraceRecord" ADD CONSTRAINT "AccessTraceRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSecurityAlert" ADD CONSTRAINT "WorkspaceSecurityAlert_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSecurityAlert" ADD CONSTRAINT "WorkspaceSecurityAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrossSessionPattern" ADD CONSTRAINT "CrossSessionPattern_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrossSessionPattern" ADD CONSTRAINT "CrossSessionPattern_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricalRegression" ADD CONSTRAINT "HistoricalRegression_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricalRegression" ADD CONSTRAINT "HistoricalRegression_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationalTrend" ADD CONSTRAINT "OrganizationalTrend_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaEvolution" ADD CONSTRAINT "PersonaEvolution_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaEvolution" ADD CONSTRAINT "PersonaEvolution_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStabilityHistory" ADD CONSTRAINT "WorkflowStabilityHistory_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStabilityHistory" ADD CONSTRAINT "WorkflowStabilityHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LongitudinalSignal" ADD CONSTRAINT "LongitudinalSignal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LongitudinalSignal" ADD CONSTRAINT "LongitudinalSignal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCorrelation" ADD CONSTRAINT "SessionCorrelation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCorrelation" ADD CONSTRAINT "SessionCorrelation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UXMemorySnapshot" ADD CONSTRAINT "UXMemorySnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UXMemorySnapshot" ADD CONSTRAINT "UXMemorySnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UXFailurePrediction" ADD CONSTRAINT "UXFailurePrediction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UXFailurePrediction" ADD CONSTRAINT "UXFailurePrediction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CognitiveRiskSignal" ADD CONSTRAINT "CognitiveRiskSignal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CognitiveRiskSignal" ADD CONSTRAINT "CognitiveRiskSignal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForecastEvidence" ADD CONSTRAINT "ForecastEvidence_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "UXFailurePrediction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRiskScore" ADD CONSTRAINT "WorkflowRiskScore_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRiskScore" ADD CONSTRAINT "WorkflowRiskScore_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictiveMemorySignal" ADD CONSTRAINT "PredictiveMemorySignal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictiveMemorySignal" ADD CONSTRAINT "PredictiveMemorySignal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedesignRecommendation" ADD CONSTRAINT "RedesignRecommendation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedesignRecommendation" ADD CONSTRAINT "RedesignRecommendation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationEvidence" ADD CONSTRAINT "RecommendationEvidence_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "RedesignRecommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UXOptimizationSuggestion" ADD CONSTRAINT "UXOptimizationSuggestion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UXOptimizationSuggestion" ADD CONSTRAINT "UXOptimizationSuggestion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CognitiveRemediation" ADD CONSTRAINT "CognitiveRemediation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CognitiveRemediation" ADD CONSTRAINT "CognitiveRemediation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowOptimization" ADD CONSTRAINT "WorkflowOptimization_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowOptimization" ADD CONSTRAINT "WorkflowOptimization_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationImpactForecast" ADD CONSTRAINT "RecommendationImpactForecast_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "RedesignRecommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedesignTrace" ADD CONSTRAINT "RedesignTrace_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "RedesignRecommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationMemorySignal" ADD CONSTRAINT "OptimizationMemorySignal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationMemorySignal" ADD CONSTRAINT "OptimizationMemorySignal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutonomousOptimizationRun" ADD CONSTRAINT "AutonomousOptimizationRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutonomousOptimizationRun" ADD CONSTRAINT "AutonomousOptimizationRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationSimulation" ADD CONSTRAINT "OptimizationSimulation_optimizationRunId_fkey" FOREIGN KEY ("optimizationRunId") REFERENCES "AutonomousOptimizationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdaptationRule" ADD CONSTRAINT "AdaptationRule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdaptationRule" ADD CONSTRAINT "AdaptationRule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationApproval" ADD CONSTRAINT "OptimizationApproval_optimizationRunId_fkey" FOREIGN KEY ("optimizationRunId") REFERENCES "AutonomousOptimizationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationApproval" ADD CONSTRAINT "OptimizationApproval_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationRollback" ADD CONSTRAINT "OptimizationRollback_optimizationRunId_fkey" FOREIGN KEY ("optimizationRunId") REFERENCES "AutonomousOptimizationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationRollback" ADD CONSTRAINT "OptimizationRollback_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutonomousDecisionTrace" ADD CONSTRAINT "AutonomousDecisionTrace_optimizationRunId_fkey" FOREIGN KEY ("optimizationRunId") REFERENCES "AutonomousOptimizationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationGovernanceEvent" ADD CONSTRAINT "OptimizationGovernanceEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationGovernanceEvent" ADD CONSTRAINT "OptimizationGovernanceEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationSafetySignal" ADD CONSTRAINT "OptimizationSafetySignal_optimizationRunId_fkey" FOREIGN KEY ("optimizationRunId") REFERENCES "AutonomousOptimizationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceIntegration" ADD CONSTRAINT "WorkspaceIntegration_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceIntegration" ADD CONSTRAINT "WorkspaceIntegration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_workspaceIntegrationId_fkey" FOREIGN KEY ("workspaceIntegrationId") REFERENCES "WorkspaceIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationEvent" ADD CONSTRAINT "IntegrationEvent_workspaceIntegrationId_fkey" FOREIGN KEY ("workspaceIntegrationId") REFERENCES "WorkspaceIntegration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationEvent" ADD CONSTRAINT "IntegrationEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplayLink" ADD CONSTRAINT "ReplayLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplayLink" ADD CONSTRAINT "ReplayLink_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceAttachment" ADD CONSTRAINT "EvidenceAttachment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceAttachment" ADD CONSTRAINT "EvidenceAttachment_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalReference" ADD CONSTRAINT "ExternalReference_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncJob" ADD CONSTRAINT "SyncJob_workspaceIntegrationId_fkey" FOREIGN KEY ("workspaceIntegrationId") REFERENCES "WorkspaceIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationAuditEvent" ADD CONSTRAINT "IntegrationAuditEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationAuditEvent" ADD CONSTRAINT "IntegrationAuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeploymentRun" ADD CONSTRAINT "DeploymentRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplayExecution" ADD CONSTRAINT "ReplayExecution_deploymentRunId_fkey" FOREIGN KEY ("deploymentRunId") REFERENCES "DeploymentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplayExecution" ADD CONSTRAINT "ReplayExecution_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreviewEnvironment" ADD CONSTRAINT "PreviewEnvironment_deploymentRunId_fkey" FOREIGN KEY ("deploymentRunId") REFERENCES "DeploymentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequestIntelligence" ADD CONSTRAINT "PullRequestIntelligence_deploymentRunId_fkey" FOREIGN KEY ("deploymentRunId") REFERENCES "DeploymentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegressionAnalysis" ADD CONSTRAINT "RegressionAnalysis_deploymentRunId_fkey" FOREIGN KEY ("deploymentRunId") REFERENCES "DeploymentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeploymentRiskSignal" ADD CONSTRAINT "DeploymentRiskSignal_deploymentRunId_fkey" FOREIGN KEY ("deploymentRunId") REFERENCES "DeploymentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildCorrelation" ADD CONSTRAINT "BuildCorrelation_deploymentRunId_fkey" FOREIGN KEY ("deploymentRunId") REFERENCES "DeploymentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseTimelineEvent" ADD CONSTRAINT "ReleaseTimelineEvent_deploymentRunId_fkey" FOREIGN KEY ("deploymentRunId") REFERENCES "DeploymentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedReplaySession" ADD CONSTRAINT "SharedReplaySession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedReplaySession" ADD CONSTRAINT "SharedReplaySession_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationThread" ADD CONSTRAINT "InvestigationThread_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationThread" ADD CONSTRAINT "InvestigationThread_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplayAnnotation" ADD CONSTRAINT "ReplayAnnotation_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "InvestigationThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollaborationEvent" ADD CONSTRAINT "CollaborationEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalAlert" ADD CONSTRAINT "OperationalAlert_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalAlert" ADD CONSTRAINT "OperationalAlert_workflowSessionId_fkey" FOREIGN KEY ("workflowSessionId") REFERENCES "WorkflowSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertEscalation" ADD CONSTRAINT "AlertEscalation_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "OperationalAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestSubscription" ADD CONSTRAINT "DigestSubscription_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMentionEvent" ADD CONSTRAINT "TeamMentionEvent_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "InvestigationThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAccount" ADD CONSTRAINT "ServiceAccount_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeveloperApplication" ADD CONSTRAINT "DeveloperApplication_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAuditEvent" ADD CONSTRAINT "PlatformAuditEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelemetryEvent" ADD CONSTRAINT "TelemetryEvent_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSignal" ADD CONSTRAINT "SessionSignal_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NavigationEvent" ADD CONSTRAINT "NavigationEvent_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelemetryInteractionEvent" ADD CONSTRAINT "TelemetryInteractionEvent_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrictionSignal" ADD CONSTRAINT "FrictionSignal_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionHeartbeat" ADD CONSTRAINT "SessionHeartbeat_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelemetryAuditRecord" ADD CONSTRAINT "TelemetryAuditRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UXAnomaly" ADD CONSTRAINT "UXAnomaly_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehavioralPattern" ADD CONSTRAINT "BehavioralPattern_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurvivabilityMetric" ADD CONSTRAINT "SurvivabilityMetric_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionBaseline" ADD CONSTRAINT "ProductionBaseline_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnomalyEvidence" ADD CONSTRAINT "AnomalyEvidence_anomalyId_fkey" FOREIGN KEY ("anomalyId") REFERENCES "UXAnomaly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnomalyEvidence" ADD CONSTRAINT "AnomalyEvidence_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "BehavioralPattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnomalyEvidence" ADD CONSTRAINT "AnomalyEvidence_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrelatedBehavior" ADD CONSTRAINT "CorrelatedBehavior_anomalyId_fkey" FOREIGN KEY ("anomalyId") REFERENCES "UXAnomaly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrelatedBehavior" ADD CONSTRAINT "CorrelatedBehavior_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "BehavioralPattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskEscalation" ADD CONSTRAINT "RiskEscalation_anomalyId_fkey" FOREIGN KEY ("anomalyId") REFERENCES "UXAnomaly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceAlert" ADD CONSTRAINT "IntelligenceAlert_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UXExperiment" ADD CONSTRAINT "UXExperiment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentVariant" ADD CONSTRAINT "ExperimentVariant_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "UXExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationHypothesis" ADD CONSTRAINT "OptimizationHypothesis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationHypothesis" ADD CONSTRAINT "OptimizationHypothesis_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "UXExperiment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentOutcome" ADD CONSTRAINT "ExperimentOutcome_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentOutcome" ADD CONSTRAINT "ExperimentOutcome_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "UXExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationImpact" ADD CONSTRAINT "RecommendationImpact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationMemory" ADD CONSTRAINT "OptimizationMemory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImprovementBaseline" ADD CONSTRAINT "ImprovementBaseline_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImprovementBaseline" ADD CONSTRAINT "ImprovementBaseline_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "UXExperiment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentEvidence" ADD CONSTRAINT "ExperimentEvidence_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "UXExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationPlan" ADD CONSTRAINT "OptimizationPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationOpportunity" ADD CONSTRAINT "OptimizationOpportunity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationForecast" ADD CONSTRAINT "OptimizationForecast_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationForecast" ADD CONSTRAINT "OptimizationForecast_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "OptimizationOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationForecast" ADD CONSTRAINT "OptimizationForecast_planId_fkey" FOREIGN KEY ("planId") REFERENCES "OptimizationPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationRoadmap" ADD CONSTRAINT "OptimizationRoadmap_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeRecommendation" ADD CONSTRAINT "InitiativeRecommendation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeRecommendation" ADD CONSTRAINT "InitiativeRecommendation_planId_fkey" FOREIGN KEY ("planId") REFERENCES "OptimizationPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeRecommendation" ADD CONSTRAINT "InitiativeRecommendation_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "OptimizationOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeRecommendation" ADD CONSTRAINT "InitiativeRecommendation_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "OptimizationRoadmap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationDecision" ADD CONSTRAINT "RecommendationDecision_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "InitiativeRecommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationOutcome" ADD CONSTRAINT "OptimizationOutcome_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "InitiativeRecommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForecastAccuracyRecord" ADD CONSTRAINT "ForecastAccuracyRecord_forecastId_fkey" FOREIGN KEY ("forecastId") REFERENCES "OptimizationForecast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicObjective" ADD CONSTRAINT "StrategicObjective_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductInitiative" ADD CONSTRAINT "ProductInitiative_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductInitiative" ADD CONSTRAINT "ProductInitiative_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "StrategicObjective"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductInitiative" ADD CONSTRAINT "ProductInitiative_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "ProductRoadmap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeEvidence" ADD CONSTRAINT "InitiativeEvidence_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "ProductInitiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRoadmap" ADD CONSTRAINT "ProductRoadmap_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicRisk" ADD CONSTRAINT "StrategicRisk_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "ProductInitiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityScore" ADD CONSTRAINT "OpportunityScore_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveMetric" ADD CONSTRAINT "ExecutiveMetric_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductHealthSnapshot" ADD CONSTRAINT "ProductHealthSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductKPI" ADD CONSTRAINT "ProductKPI_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KPIHistory" ADD CONSTRAINT "KPIHistory_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "ProductKPI"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOutcome" ADD CONSTRAINT "ProductOutcome_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOutcome" ADD CONSTRAINT "ProductOutcome_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "ProductInitiative"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutcomeEvidence" ADD CONSTRAINT "OutcomeEvidence_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "ProductOutcome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeImpact" ADD CONSTRAINT "InitiativeImpact_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "ProductOutcome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeImpact" ADD CONSTRAINT "InitiativeImpact_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "ProductKPI"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductHealthScore" ADD CONSTRAINT "ProductHealthScore_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutcomeBaseline" ADD CONSTRAINT "OutcomeBaseline_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "ProductKPI"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KPIForecast" ADD CONSTRAINT "KPIForecast_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "ProductKPI"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioObjective" ADD CONSTRAINT "PortfolioObjective_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioObjective" ADD CONSTRAINT "PortfolioObjective_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "StrategicObjective"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlignmentRecord" ADD CONSTRAINT "AlignmentRecord_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlignmentRecord" ADD CONSTRAINT "AlignmentRecord_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "ProductInitiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlignmentRecord" ADD CONSTRAINT "AlignmentRecord_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "StrategicObjective"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicGap" ADD CONSTRAINT "StrategicGap_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DependencyRecord" ADD CONSTRAINT "DependencyRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DependencyRecord" ADD CONSTRAINT "DependencyRecord_sourceInitiativeId_fkey" FOREIGN KEY ("sourceInitiativeId") REFERENCES "ProductInitiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DependencyRecord" ADD CONSTRAINT "DependencyRecord_targetInitiativeId_fkey" FOREIGN KEY ("targetInitiativeId") REFERENCES "ProductInitiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioHealthSnapshot" ADD CONSTRAINT "PortfolioHealthSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentAllocation" ADD CONSTRAINT "InvestmentAllocation_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationalRisk" ADD CONSTRAINT "OrganizationalRisk_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveRecommendation" ADD CONSTRAINT "ExecutiveRecommendation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionRecord" ADD CONSTRAINT "DecisionRecord_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "ExecutiveRecommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionRecord" ADD CONSTRAINT "DecisionRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceReview" ADD CONSTRAINT "GovernanceReview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicRiskRecord" ADD CONSTRAINT "StrategicRiskRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveHealthSnapshot" ADD CONSTRAINT "ExecutiveHealthSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernancePolicyReview" ADD CONSTRAINT "GovernancePolicyReview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveEvidence" ADD CONSTRAINT "ExecutiveEvidence_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "ExecutiveRecommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionOutcome" ADD CONSTRAINT "DecisionOutcome_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "DecisionRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEntity" ADD CONSTRAINT "KnowledgeEntity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeRelationship" ADD CONSTRAINT "KnowledgeRelationship_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeRelationship" ADD CONSTRAINT "KnowledgeRelationship_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeRelationship" ADD CONSTRAINT "KnowledgeRelationship_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "KnowledgeEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceLink" ADD CONSTRAINT "EvidenceLink_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "KnowledgeRelationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphSnapshot" ADD CONSTRAINT "GraphSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipEvidence" ADD CONSTRAINT "RelationshipEvidence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryRecord" ADD CONSTRAINT "DiscoveryRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryRecord" ADD CONSTRAINT "DiscoveryRecord_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "KnowledgeEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeTimeline" ADD CONSTRAINT "KnowledgeTimeline_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeTimeline" ADD CONSTRAINT "KnowledgeTimeline_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "KnowledgeEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphHealthRecord" ADD CONSTRAINT "GraphHealthRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPattern" ADD CONSTRAINT "LearningPattern_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricalCase" ADD CONSTRAINT "HistoricalCase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessPattern" ADD CONSTRAINT "SuccessPattern_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FailurePattern" ADD CONSTRAINT "FailurePattern_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurrenceRecord" ADD CONSTRAINT "RecurrenceRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurrenceRecord" ADD CONSTRAINT "RecurrenceRecord_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "LearningPattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationalLesson" ADD CONSTRAINT "OrganizationalLesson_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatternEvidence" ADD CONSTRAINT "PatternEvidence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatternEvidence" ADD CONSTRAINT "PatternEvidence_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "LearningPattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningSnapshot" ADD CONSTRAINT "LearningSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForecastRecord" ADD CONSTRAINT "ForecastRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicForecastEvidence" ADD CONSTRAINT "StrategicForecastEvidence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicForecastEvidence" ADD CONSTRAINT "StrategicForecastEvidence_forecastId_fkey" FOREIGN KEY ("forecastId") REFERENCES "ForecastRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioAnalysis" ADD CONSTRAINT "ScenarioAnalysis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioOutcome" ADD CONSTRAINT "ScenarioOutcome_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioOutcome" ADD CONSTRAINT "ScenarioOutcome_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "ScenarioAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForecastAssumption" ADD CONSTRAINT "ForecastAssumption_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForecastAssumption" ADD CONSTRAINT "ForecastAssumption_forecastId_fkey" FOREIGN KEY ("forecastId") REFERENCES "ForecastRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergingRisk" ADD CONSTRAINT "EmergingRisk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfidenceRecord" ADD CONSTRAINT "ConfidenceRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfidenceRecord" ADD CONSTRAINT "ConfidenceRecord_forecastId_fkey" FOREIGN KEY ("forecastId") REFERENCES "ForecastRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForecastSnapshot" ADD CONSTRAINT "ForecastSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionalLesson" ADD CONSTRAINT "InstitutionalLesson_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationalPrinciple" ADD CONSTRAINT "OrganizationalPrinciple_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WisdomRecord" ADD CONSTRAINT "WisdomRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WisdomEvidence" ADD CONSTRAINT "WisdomEvidence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WisdomEvidence" ADD CONSTRAINT "WisdomEvidence_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "InstitutionalLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricalSynthesis" ADD CONSTRAINT "HistoricalSynthesis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LongTermTrend" ADD CONSTRAINT "LongTermTrend_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicLearning" ADD CONSTRAINT "StrategicLearning_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WisdomSnapshot" ADD CONSTRAINT "WisdomSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
