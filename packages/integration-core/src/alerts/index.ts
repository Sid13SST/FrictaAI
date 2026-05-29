import { prisma } from '@fricta/db';
import { AlertEscalationManager } from '../escalations';

export interface TriggerAlertDto {
  projectId: string;
  alertType: 'SURVIVABILITY_DROP' | 'COGNITIVE_OVERLOAD' | 'REGRESSION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  workflowSessionId?: string;
  channels: Array<'SLACK' | 'DISCORD' | 'TEAMS' | 'EMAIL'>;
  recipients?: Record<string, string>; // Maps channel -> webhook/email
}

export class AlertManager {
  /**
   * Triggers an operational alert on cognitive spikes, regression, or survivability drops.
   * Dispatches escalation processes based on selected channels.
   */
  static async triggerAlert(dto: TriggerAlertDto): Promise<any> {
    console.log(`[AlertManager] Triggering alert of type ${dto.alertType} [${dto.severity}]`);

    const alert = await prisma.operationalAlert.create({
      data: {
        projectId: dto.projectId,
        alertType: dto.alertType,
        severity: dto.severity,
        message: dto.message,
        workflowSessionId: dto.workflowSessionId || null,
        resolved: false,
      },
    });

    // Escalate to each configured channel
    for (const channel of dto.channels) {
      const recipient = dto.recipients?.[channel] || `mock-channel-${channel.toLowerCase()}`;
      await AlertEscalationManager.escalateAlert(alert.id, {
        channel,
        recipient,
        alertType: dto.alertType,
        severity: dto.severity,
        message: dto.message,
        workflowSessionId: dto.workflowSessionId,
      });
    }

    return alert;
  }

  /**
   * Resolves a triggered operational alert.
   */
  static async resolveAlert(alertId: string): Promise<any> {
    return prisma.operationalAlert.update({
      where: { id: alertId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
      },
    });
  }

  /**
   * Fetches active (unresolved) alerts for a project.
   */
  static async getActiveAlerts(projectId: string): Promise<any[]> {
    return prisma.operationalAlert.findMany({
      where: {
        projectId,
        resolved: false,
      },
      include: {
        escalations: true,
        workflowSession: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Fetches all alerts for a project.
   */
  static async getAlerts(projectId: string): Promise<any[]> {
    return prisma.operationalAlert.findMany({
      where: { projectId },
      include: {
        escalations: true,
        workflowSession: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
