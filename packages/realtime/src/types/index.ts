export type RealtimeEventType =
  | 'orchestration.started'
  | 'orchestration.updated'
  | 'orchestration.completed'
  | 'agent.started'
  | 'agent.progress'
  | 'agent.finding'
  | 'agent.failed'
  | 'delegation.triggered'
  | 'correlation.generated'
  | 'insight.generated'
  | 'replay.updated'
  | 'screenshot.captured'
  | 'memory.updated'
  | 'runtime.telemetry'
  | 'presence.sync'
  | 'annotation.created'
  | 'annotation.resolved'
  | 'comment.created'
  | 'review.updated'
  | 'workspace.members.updated'
  | 'workspace.projects.updated'
  | 'workspace.investigations.updated'
  | 'workspace.comments.updated'
  | 'cognition.updated'
  | 'swarm.step'
  | 'predictive.forecast'
  | 'predictive.risk'
  | 'predictive.regression'
  | 'workspace.policy.updated'
  | 'workspace.roles.updated'
  | 'workspace.access.revoked'
  | 'workspace.replay-sync.updated'
  | 'workspace.reports.updated'
  | 'workspace.exports.progress'
  | 'workspace.digest.delivered';

export interface RealtimeEvent<T = any> {
  id?: string;
  timestamp?: string;
  orchestrationSessionId: string;
  eventType: RealtimeEventType;
  payload: T;
}

// Subpayload definitions for strong type safety

export interface OrchestrationStartedPayload {
  workflowSessionId: string;
  goal: string;
  startedAt: string;
}

export interface OrchestrationUpdatedPayload {
  status: string;
  metadata?: any;
}

export interface OrchestrationCompletedPayload {
  status: string;
  completedAt: string;
  metadata?: any;
}

export interface AgentStartedPayload {
  taskId: string;
  agentType: string;
  description: string;
}

export interface AgentProgressPayload {
  taskId: string;
  agentType: string;
  description: string;
  step?: string;
}

export interface AgentFindingPayload {
  taskId: string;
  agentType: string;
  finding: {
    id: string;
    findingType: string;
    severity: string;
    title: string;
    description: string;
    evidence: string;
  };
}

export interface AgentFailedPayload {
  taskId: string;
  agentType: string;
  error: string;
  retryCount?: number;
}

export interface DelegationTriggeredPayload {
  fromAgent: string;
  toAgent: string;
  eventType: string;
  payload?: any;
}

export interface CorrelationGeneratedPayload {
  correlationId: string;
  findingIds: string[];
  correlationType: string;
  summary: string;
  confidence: number;
  metadata?: any;
}

export interface InsightGeneratedPayload {
  insightId: string;
  title: string;
  summary: string;
  supportingEvidence: string;
  severity: string;
  confidence: number;
}

export interface ReplayUpdatedPayload {
  stepIndex: number;
  timestamp: string;
  screenshot?: {
    id: string;
    filePath: string;
    pageUrl: string;
    actionContext: string | null;
  };
  action?: {
    type: string;
    target: string;
    value: string | null;
    status: string;
  } | null;
  thoughts: string[];
  findings: Array<{
    id: string;
    title: string;
    severity: string;
    recommendation: string;
  }>;
}

export interface ScreenshotCapturedPayload {
  id: string;
  workflowSessionId: string;
  screenshotType: string;
  filePath: string;
  thumbnailPath: string;
  stepIndex: number;
  pageUrl: string;
  viewportWidth: number;
  viewportHeight: number;
  actionContext: string | null;
  fileSize: number;
  metadata?: any;
}

export interface MemoryUpdatedPayload {
  id: string;
  eventType: string;
  sourceAgent: string;
  payload: any;
  timestamp: string;
}
