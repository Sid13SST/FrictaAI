export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'UX_LEAD' | 'INVESTIGATOR' | 'REVIEWER' | 'VIEWER';

export type WorkspaceAction =
  | 'READ_WORKSPACE'
  | 'MANAGE_MEMBERS'
  | 'RUN_INVESTIGATION'
  | 'WRITE_ANNOTATION'
  | 'MANAGE_REVIEWS'
  | 'SHARE_INTELLIGENCE'
  | 'MANAGE_GOVERNANCE'
  | 'VIEW_AUDIT_LOGS';

export interface WorkspaceMemberInfo {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: WorkspaceRole;
}

export interface ActiveUserPresence {
  userId: string;
  name: string;
  activeScreen: string; // e.g. "replay:session-id" | "workspace:id"
  lastActive: Date;
  cursor?: { x: number; y: number };
}

export interface OrganizationBranding {
  logoUrl?: string;
  primaryColor?: string;
  companyName: string;
}

export interface WorkspaceBillingLimits {
  maxMembers: number;
  maxWorkspaces: number;
  maxProjects: number;
  currentMembers: number;
  currentWorkspaces: number;
  currentProjects: number;
  tier: 'FREE' | 'GROWTH' | 'ENTERPRISE';
}

export interface WorkspaceActivityLog {
  id: string;
  workspaceId: string;
  userId: string;
  userName: string;
  actionType: string;
  description: string;
  metadata?: any;
  createdAt: Date;
}
