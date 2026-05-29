// ─── Phase 11 Part 1: Integration Core Types ─────────────────────────────────

export type IntegrationProvider =
  | 'FIGMA'
  | 'FIGJAM'
  | 'NOTION'
  | 'JIRA'
  | 'LINEAR'
  | 'GITHUB'
  | 'PRODUCTBOARD';

export type IntegrationStatus =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'ERROR'
  | 'PENDING';

export type ConnectionType =
  | 'PROJECT'
  | 'FILE'
  | 'BOARD'
  | 'REPO'
  | 'TEAM';

export type LinkType =
  | 'FRAME'
  | 'ISSUE'
  | 'PR'
  | 'PAGE'
  | 'FEATURE'
  | 'COMMIT'
  | 'BOARD';

export type AttachmentType =
  | 'SCREENSHOT'
  | 'FINDING'
  | 'COGNITIVE_SIGNAL'
  | 'SURVIVABILITY'
  | 'REPLAY_CLIP';

export type SyncJobStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'DEAD_LETTER';

export type IntegrationEventDirection = 'INCOMING' | 'OUTGOING';

export type IntegrationAuditAction =
  | 'CONNECT'
  | 'DISCONNECT'
  | 'TOKEN_REFRESH'
  | 'REPLAY_LINKED'
  | 'EVIDENCE_ATTACHED'
  | 'TICKET_CREATED'
  | 'WEBHOOK_RECEIVED';

export type ExternalRefType =
  | 'ISSUE'
  | 'PR'
  | 'COMMIT'
  | 'FRAME'
  | 'PAGE'
  | 'FEATURE';

// ─── Summary DTOs ─────────────────────────────────────────────────────────────

export interface WorkspaceIntegrationSummary {
  id: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  providerUserId?: string;
  providerOrgId?: string;
  lastSyncedAt?: Date;
  connections: IntegrationConnectionSummary[];
}

export interface IntegrationConnectionSummary {
  id: string;
  provider: IntegrationProvider;
  externalId: string;
  externalName: string;
  externalUrl?: string;
  connectionType: ConnectionType;
  active: boolean;
}

export interface ReplayLinkSummary {
  id: string;
  provider: IntegrationProvider;
  externalResourceId: string;
  externalResourceName?: string;
  externalResourceUrl?: string;
  linkType: LinkType;
  uxFindingId?: string;
  evidenceSummary?: string;
  createdAt: Date;
}

export interface EvidenceAttachmentSummary {
  id: string;
  provider: IntegrationProvider;
  externalId: string;
  attachmentType: AttachmentType;
  title: string;
  description?: string;
  severity?: string;
  evidenceUrl?: string;
  createdAt: Date;
}

export interface SyncJobSummary {
  id: string;
  provider: IntegrationProvider;
  jobType: string;
  status: SyncJobStatus;
  retryCount: number;
  errorMessage?: string;
  scheduledAt: Date;
  completedAt?: Date;
}

export interface IntegrationAuditEventSummary {
  id: string;
  provider: IntegrationProvider;
  action: IntegrationAuditAction;
  description: string;
  resourceId?: string;
  policyPassed: boolean;
  createdAt: Date;
}

// ─── Replay Context Payload (propagated to external tools) ────────────────────

export interface ReplayContext {
  sessionId: string;
  sessionGoal?: string;
  findingTitle?: string;
  findingSeverity?: string;
  cognitiveLoad?: number;
  survivabilityRate?: number;
  screenshotUrl?: string;
  frictionScore?: number;
  stepIndex?: number;
}

// ─── Provider Config Schemas ──────────────────────────────────────────────────

export interface FigmaConfig {
  fileId?: string;
  teamId?: string;
  projectId?: string;
}

export interface JiraConfig {
  baseUrl: string;
  projectKey: string;
  issueType?: string;
}

export interface LinearConfig {
  teamId: string;
  projectId?: string;
}

export interface GitHubConfig {
  owner: string;
  repo: string;
}

export interface NotionConfig {
  databaseId?: string;
  pageId?: string;
}

export interface ProductboardConfig {
  workspaceId?: string;
}
