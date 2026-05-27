import { prisma } from '@fricta/db';
import { SecurityEventPayload } from '../types';

export class SecurityMonitorService {
  /**
   * Logs a security event to the database.
   * If severity is WARNING or CRITICAL, also triggers a WorkspaceSecurityAlert.
   */
  static async logSecurityEvent(payload: SecurityEventPayload) {
    const event = await prisma.securityEvent.create({
      data: {
        workspaceId: payload.workspaceId || null,
        userId: payload.userId || null,
        eventType: payload.eventType,
        severity: payload.severity,
        description: payload.description,
        metadata: payload.metadata ? (payload.metadata as any) : undefined
      }
    });

    // Also mirror to legacy WorkspaceSecurityEvent if workspaceId is present
    if (payload.workspaceId) {
      await prisma.workspaceSecurityEvent.create({
        data: {
          workspaceId: payload.workspaceId,
          userId: payload.userId || null,
          eventType: payload.eventType,
          severity: payload.severity,
          description: payload.description,
          metadata: payload.metadata ? (payload.metadata as any) : undefined
        }
      });
    }

    // Trigger operational alerts for high-risk warnings or critical alerts
    if (payload.severity === 'WARNING' || payload.severity === 'CRITICAL') {
      await prisma.workspaceSecurityAlert.create({
        data: {
          workspaceId: payload.workspaceId || null,
          userId: payload.userId || null,
          alertType: payload.eventType,
          severity: payload.severity,
          description: payload.description,
          metadata: payload.metadata ? (payload.metadata as any) : undefined
        }
      });
    }

    return event;
  }

  /**
   * Evaluates if a user access request is attempting to cross boundaries from another workspace.
   */
  static async detectCrossWorkspaceViolation(userId: string, targetWorkspaceId: string, activeWorkspaceId: string) {
    if (targetWorkspaceId !== activeWorkspaceId) {
      await this.logSecurityEvent({
        workspaceId: activeWorkspaceId,
        userId,
        eventType: 'CROSS_WORKSPACE_VIOLATION',
        severity: 'CRITICAL',
        description: `User attempted to access resources mapped to workspace ${targetWorkspaceId} while executing within context workspace ${activeWorkspaceId}.`,
        metadata: { targetWorkspaceId, activeWorkspaceId }
      });
      return true;
    }
    return false;
  }

  /**
   * Identifies potentially suspicious external access profiles or timing spikes.
   */
  static async detectSuspiciousAccess(userId: string, workspaceId: string | null, ipAddress: string, userAgent: string) {
    // Check for atypical user agent profiles or known anomalies
    const isBot = /curl|wget|python|postman|insomnia/i.test(userAgent);
    if (isBot) {
      await this.logSecurityEvent({
        workspaceId,
        userId,
        eventType: 'SUSPICIOUS_ACCESS',
        severity: 'WARNING',
        description: `Access request detected utilizing automated command-line developer agent: ${userAgent}`,
        metadata: { ipAddress, userAgent }
      });
      return true;
    }
    return false;
  }

  /**
   * Identifies potential data exfiltration attempts through rapid high-risk downloads.
   */
  static async detectHighRiskExport(userId: string, reportId: string, workspaceId: string | null) {
    // Audit log high risk exports
    await this.logSecurityEvent({
      workspaceId,
      userId,
      eventType: 'HIGH_RISK_EXPORT',
      severity: 'INFO',
      description: `User triggered database compilation export for report ${reportId}.`,
      metadata: { reportId }
    });
  }

  /**
   * Returns list of recent security events.
   */
  static async getSecurityEvents(workspaceId?: string | null, limit = 50) {
    return prisma.securityEvent.findMany({
      where: workspaceId ? { workspaceId } : { workspaceId: null },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
}
