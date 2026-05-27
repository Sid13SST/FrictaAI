import { PrismaClient } from '@fricta/db';
import { PolicyKey, PolicyValue } from '../types';

export class WorkspacePolicyEvaluator {
  constructor(private prisma: PrismaClient) {}

  /**
   * Retrieves policy value. If not set, returns standard defaults.
   */
  async getPolicy(workspaceId: string, key: PolicyKey): Promise<PolicyValue> {
    const policy = await this.prisma.workspacePolicy.findFirst({
      where: { workspaceId, key },
    });

    if (policy) {
      return policy.value;
    }

    // Default policy configurations
    switch (key) {
      case 'inviteRestrictions':
        return 'ADMIN_ONLY'; // only admin and owner can invite
      case 'externalSharing':
        return 'DISABLED'; // external sharing disabled by default
      case 'guestAccess':
        return 'ENABLED'; // guests can join by default
      case 'replaySharing':
        return 'WORKSPACE_ONLY'; // replays visible to workspace only by default
      case 'exportRestrictions':
        return 'ENABLED'; // all roles can export by default
      case 'workspaceVisibility':
        return 'PRIVATE'; // workspace is private to members by default
      default:
        return 'ENABLED';
    }
  }

  /**
   * Sets or updates a policy key-value pair in a workspace.
   */
  async setPolicy(workspaceId: string, key: PolicyKey, value: PolicyValue) {
    const existing = await this.prisma.workspacePolicy.findFirst({
      where: { workspaceId, key },
    });

    if (existing) {
      return this.prisma.workspacePolicy.update({
        where: { id: existing.id },
        data: { value },
      });
    } else {
      return this.prisma.workspacePolicy.create({
        data: {
          workspaceId,
          key,
          value,
        },
      });
    }
  }

  /**
   * Verifies if a specific action violates any active workspace policy.
   */
  async evaluateActionAgainstPolicy(
    workspaceId: string,
    key: PolicyKey,
    actorRole: string
  ): Promise<boolean> {
    const policyValue = await this.getPolicy(workspaceId, key);

    if (policyValue === 'DISABLED') {
      return false;
    }

    if (policyValue === 'OWNER_ONLY') {
      return actorRole === 'OWNER';
    }

    if (policyValue === 'ADMIN_ONLY') {
      return actorRole === 'OWNER' || actorRole === 'ADMIN';
    }

    return true; // ENABLED or standard public/workspace scopes
  }
}
