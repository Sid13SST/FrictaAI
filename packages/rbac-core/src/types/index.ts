export type RBACRoleName = 'OWNER' | 'ADMIN' | 'ANALYST' | 'VIEWER' | 'GUEST' | string;

export type PermissionDomain =
  | 'WORKSPACE'
  | 'PROJECT'
  | 'INVESTIGATION'
  | 'REPLAY'
  | 'ANALYTICS'
  | 'SWARM'
  | 'EXPORT'
  | 'TEAM';

export type PermissionAction = 'READ' | 'WRITE' | 'EXECUTE' | 'MANAGE';

export interface EvaluatedPermission {
  domain: PermissionDomain;
  action: PermissionAction;
  isAllowed: boolean;
}

export type PolicyKey =
  | 'inviteRestrictions'
  | 'externalSharing'
  | 'guestAccess'
  | 'replaySharing'
  | 'exportRestrictions'
  | 'workspaceVisibility';

export type PolicyValue = 'OWNER_ONLY' | 'ADMIN_ONLY' | 'ENABLED' | 'DISABLED' | 'PUBLIC' | 'PRIVATE' | string;

export interface WorkspacePolicyItem {
  key: PolicyKey;
  value: PolicyValue;
}
