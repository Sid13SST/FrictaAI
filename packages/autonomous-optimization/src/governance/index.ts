import { prisma } from '@fricta/db';
import { OptimizationGovernanceEventSummary } from '../types';

export class GovernanceEnforcer {
  /**
   * Validates if the action meets workspace policy checks and logs an audit record.
   */
  static async validateAndLogEvent(
    projectId: string,
    workspaceId: string | null,
    userId: string | null,
    action: 'CREATE_RULE' | 'REVOKE_APPROVAL' | 'ENFORCE_RETENTION' | 'TRIGGER_RUN' | 'EXECUTE_ROLLBACK',
    description: string
  ): Promise<OptimizationGovernanceEventSummary> {
    let policyPassed = true;

    if (workspaceId) {
      // Evaluate policy configurations
      const policy = await prisma.workspacePolicy.findFirst({
        where: { workspaceId, key: 'externalSharing' }
      });
      if (policy && policy.value === 'DISABLED' && action === 'CREATE_RULE') {
        policyPassed = false;
      }
    }

    const dbEvent = await prisma.optimizationGovernanceEvent.create({
      data: {
        workspaceId,
        userId,
        action,
        description: `${description} (Policy Check: ${policyPassed ? 'PASSED' : 'FAILED'})`,
        policyPassed
      }
    });

    return {
      id: dbEvent.id,
      userId: dbEvent.userId || undefined,
      action: dbEvent.action,
      description: dbEvent.description,
      policyPassed: dbEvent.policyPassed
    };
  }
}
