export interface AuditLogPayload {
  workspaceId?: string | null;
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  description: string;
  metadata?: any;
}

export interface SecurityEventPayload {
  workspaceId?: string | null;
  userId?: string | null;
  eventType: string; // e.g. "UNAUTHORIZED_ATTEMPT", "SUSPICIOUS_ACCESS", "CROSS_WORKSPACE_VIOLATION"
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  description: string;
  metadata?: any;
}

export interface ReplayAuditPayload {
  workspaceId?: string | null;
  workflowSessionId: string;
  userId?: string | null;
  action: 'ACCESS' | 'EXPORT' | 'SHARE' | 'VISIBILITY_CHANGE';
  description: string;
  metadata?: any;
}

export interface InvestigationAuditPayload {
  workspaceId?: string | null;
  sharedInvestigationId: string;
  userId?: string | null;
  action: 'READ' | 'WRITE' | 'COMMENT' | 'PERMISSION_CHANGE';
  description: string;
  metadata?: any;
}

export interface ComplianceReadinessItem {
  key: string;
  name: string;
  description: string;
  status: 'COMPLIANT' | 'WARNING' | 'NON_COMPLIANT';
  actionRequired?: string;
}

export interface ComplianceReadinessReport {
  score: number; // 0 to 100
  items: ComplianceReadinessItem[];
  checkedAt: string;
}
