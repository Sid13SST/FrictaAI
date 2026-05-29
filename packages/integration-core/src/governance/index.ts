import { prisma } from '@fricta/db';
import { IntegrationProvider, IntegrationAuditAction } from '../types';

/**
 * IntegrationGovernanceLogger — governance-grade audit trail for all integration operations.
 *
 * Every integration action (connect, disconnect, replay link, evidence attach, ticket create)
 * is logged immutably. Provides full operational traceability for compliance and review.
 */
export class IntegrationGovernanceLogger {
  /**
   * Log an integration audit event with full context preservation.
   */
  static async log(
    provider: IntegrationProvider,
    action: IntegrationAuditAction,
    description: string,
    workspaceId: string | null,
    userId?: string | null,
    resourceId?: string,
    policyPassed = true
  ): Promise<string> {
    const event = await prisma.integrationAuditEvent.create({
      data: {
        workspaceId: workspaceId ?? null,
        userId: userId ?? null,
        provider,
        action,
        description,
        resourceId,
        policyPassed
      }
    });

    return event.id;
  }

  /**
   * Retrieve governance audit events for a workspace (or solo context).
   */
  static async getAuditLog(
    workspaceId: string | null,
    provider?: IntegrationProvider,
    limit = 100
  ): Promise<any[]> {
    return prisma.integrationAuditEvent.findMany({
      where: {
        workspaceId: workspaceId ?? null,
        ...(provider ? { provider } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { id: true, name: true, email: true } } }
    });
  }

  /**
   * Validate that a provider connection has governance clearance for an action.
   * Returns true when solo mode (workspaceId = null).
   */
  static async checkPolicyCompliance(
    workspaceId: string | null,
    provider: IntegrationProvider
  ): Promise<boolean> {
    if (!workspaceId) return true; // solo-mode bypass

    const integration = await prisma.workspaceIntegration.findFirst({
      where: { workspaceId, provider, status: 'CONNECTED' }
    });

    return !!integration;
  }
}
