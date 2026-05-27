import { PrismaClient } from '@fricta/db';
import { RBACPermissionEvaluator } from '../permissions';
import { WorkspacePolicyEvaluator } from '../policies';
import { ReplayScopeManager } from '../scoping';
import { WorkspaceProjectScopeManager } from '../projects';
import { WorkspaceInvestigationSecurityManager } from '../investigations';
import { PermissionDomain, PermissionAction } from '../types';

export class RBACAuthorizationGuard {
  private permissionEvaluator: RBACPermissionEvaluator;
  private policyEvaluator: WorkspacePolicyEvaluator;
  private replayScopeManager: ReplayScopeManager;
  private projectScopeManager: WorkspaceProjectScopeManager;
  private investigationSecurityManager: WorkspaceInvestigationSecurityManager;

  constructor(private prisma: PrismaClient) {
    this.permissionEvaluator = new RBACPermissionEvaluator(prisma);
    this.policyEvaluator = new WorkspacePolicyEvaluator(prisma);
    this.replayScopeManager = new ReplayScopeManager(prisma);
    this.projectScopeManager = new WorkspaceProjectScopeManager(prisma);
    this.investigationSecurityManager = new WorkspaceInvestigationSecurityManager(prisma);
  }

  /**
   * Evaluates if user has explicit permission to run an operation.
   */
  async checkWorkspacePermission(
    userId: string,
    workspaceId: string | null,
    domain: PermissionDomain,
    action: PermissionAction
  ): Promise<boolean> {
    return this.permissionEvaluator.checkPermission(userId, domain, action, workspaceId);
  }

  /**
   * Evaluates if a replay is accessible by the member.
   */
  async checkReplayAccess(
    userId: string,
    workspaceId: string,
    workflowSessionId: string
  ): Promise<boolean> {
    return this.replayScopeManager.canViewReplay(workspaceId, workflowSessionId, userId);
  }

  /**
   * Evaluates if project belongs to workspace context.
   */
  async checkProjectScope(
    workspaceId: string,
    projectId: string
  ): Promise<boolean> {
    return this.projectScopeManager.isProjectInScope(projectId, workspaceId);
  }

  /**
   * Evaluates if member has access to shared investigation.
   */
  async checkInvestigationAccess(
    userId: string,
    workspaceId: string,
    sharedInvestigationId: string,
    action: 'READ' | 'WRITE'
  ): Promise<boolean> {
    return this.investigationSecurityManager.canAccessSharedInvestigation(
      workspaceId,
      sharedInvestigationId,
      userId,
      action
    );
  }
}
