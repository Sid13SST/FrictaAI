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
}
