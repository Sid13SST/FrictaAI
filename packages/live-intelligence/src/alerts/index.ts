import { prisma } from '@fricta/db';

export class AlertManager {
  /**
   * Generates a system alert in the database and triggers external notifications for high-severity issues.
   */
  public static async createAlert(
    projectId: string,
    alertType: string,
    title: string,
    message: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ): Promise<void> {
    // 1. Create alert record in the database
    await prisma.intelligenceAlert.create({
      data: {
        projectId,
        alertType,
        title,
        message,
        severity,
        isRead: false,
      },
    });

    console.log(`[AlertManager] Alert generated: [${severity}] ${title} — ${message}`);

    // 2. Dispatch to registered webhooks (Integrations)
    try {
      const integrations = await prisma.workspaceIntegration.findMany({
        where: { projectId, status: 'CONNECTED' },
      });

      for (const integration of integrations) {
        if (integration.provider === 'SLACK' || integration.provider === 'WEBHOOK') {
          const config: any = integration.metadata || {};
          const webhookUrl = config.webhookUrl || config.url;

          if (webhookUrl) {
            await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event: 'FrictaAlertTriggered',
                timestamp: new Date().toISOString(),
                projectId,
                alertType,
                title,
                message,
                severity,
              }),
            }).catch((e) => console.error('[AlertManager] Webhook delivery failed:', e.message));
          }
        }
      }
    } catch (err) {
      console.error('[AlertManager] Integration query failed:', err);
    }
  }

  /**
   * Marks a specific alert as read/dismissed.
   */
  public static async markAsRead(alertId: string): Promise<void> {
    await prisma.intelligenceAlert.update({
      where: { id: alertId },
      data: { isRead: true },
    });
  }
}
