import { prisma } from '@fricta/db';

export class AlertsService {
  /**
   * Resolves a warning or critical WorkspaceSecurityAlert.
   */
  static async resolveAlert(alertId: string, resolvedById: string) {
    const alert = await prisma.workspaceSecurityAlert.findUnique({
      where: { id: alertId }
    });

    if (!alert) throw new Error('Alert not found');

    const updated = await prisma.workspaceSecurityAlert.update({
      where: { id: alertId },
      data: {
        resolved: true,
        resolvedById,
        resolvedAt: new Date()
      }
    });

    // Log general audit resolution event
    if (alert.workspaceId) {
      await prisma.workspaceSecurityEvent.create({
        data: {
          workspaceId: alert.workspaceId,
          userId: resolvedById,
          eventType: 'RESOLVE_ALERT',
          severity: 'INFO',
          description: `Security alert ${alert.alertType} (ID: ${alertId}) was resolved by user.`,
          metadata: { alertId }
        }
      });
    }

    return updated;
  }

  /**
   * Returns list of alerts.
   */
  static async getAlerts(workspaceId?: string | null) {
    return prisma.workspaceSecurityAlert.findMany({
      where: workspaceId ? { workspaceId } : { workspaceId: null },
      orderBy: { createdAt: 'desc' }
    });
  }
}
