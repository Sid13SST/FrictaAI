import { PrismaClient } from '@fricta/db';

export class WorkspaceSecurityAuditLogger {
  constructor(private prisma: PrismaClient) {}

  /**
   * Logs a security audit event
   */
  async logSecurityEvent(
    workspaceId: string,
    userId: string | null,
    eventType: 'ROLE_CHANGE' | 'POLICY_UPDATE' | 'UNAUTHORIZED_ACCESS' | 'EXTERNAL_SHARE' | 'REVOCATION',
    severity: 'INFO' | 'WARNING' | 'CRITICAL',
    description: string,
    metadata?: any
  ) {
    return this.prisma.workspaceSecurityEvent.create({
      data: {
        workspaceId,
        userId: userId || null,
        eventType,
        severity,
        description,
        metadata: metadata ? (metadata as any) : undefined,
      },
    });
  }

  /**
   * Retrieves security audit events for a workspace
   */
  async getSecurityEvents(workspaceId: string) {
    return this.prisma.workspaceSecurityEvent.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
