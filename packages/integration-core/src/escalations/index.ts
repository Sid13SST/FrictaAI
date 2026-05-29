import { prisma } from '@fricta/db';
import { SlackConnector } from '../slack';
import { DiscordConnector } from '../discord';
import { TeamsConnector } from '../teams';
import { EmailConnector } from '../email';

export interface EscalateDto {
  channel: 'SLACK' | 'DISCORD' | 'TEAMS' | 'EMAIL';
  recipient: string;
  alertType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  workflowSessionId?: string;
}

export class AlertEscalationManager {
  /**
   * Dispatches the alert to the appropriate channel and logs the outcome.
   */
  static async escalateAlert(alertId: string, dto: EscalateDto): Promise<any> {
    console.log(`[AlertEscalationManager] Escalating alert ${alertId} to ${dto.channel} (${dto.recipient})`);

    let success = false;
    let errorMsg: string | null = null;

    try {
      const sessionUrl = dto.workflowSessionId 
        ? `http://localhost:3000/app/sessions/${dto.workflowSessionId}` 
        : undefined;

      switch (dto.channel) {
        case 'SLACK': {
          const res = await SlackConnector.sendAlert(dto.recipient, {
            title: `Operational Incident: ${dto.alertType}`,
            message: dto.message,
            severity: dto.severity,
            sessionUrl,
            timestamp: new Date(),
          });
          success = res.success;
          errorMsg = res.error || null;
          break;
        }
        case 'DISCORD': {
          const color = DiscordConnector.getEmbedColorForSeverity(dto.severity);
          const res = await DiscordConnector.sendEmbed(dto.recipient, {
            title: `🚨 Fricta Alert: ${dto.alertType} [${dto.severity}]`,
            description: dto.message,
            color,
            url: sessionUrl,
            timestamp: new Date(),
            fields: [
              { name: 'Incident Level', value: dto.severity, inline: true },
              { name: 'Investigation Room', value: sessionUrl || 'N/A', inline: true },
            ],
          });
          success = res.success;
          errorMsg = res.error || null;
          break;
        }
        case 'TEAMS': {
          const res = await TeamsConnector.sendCard(dto.recipient, {
            title: `Fricta Incident Triggered`,
            summary: `Incident type: ${dto.alertType}`,
            themeColor: dto.severity === 'CRITICAL' ? 'FF0000' : 'FFA500',
            sections: [
              {
                activityTitle: `Type: ${dto.alertType}`,
                activitySubtitle: `Severity: ${dto.severity}`,
                text: dto.message,
                facts: [
                  { name: 'Timeline Trigger', value: new Date().toISOString() },
                  { name: 'Trace Link', value: sessionUrl || 'N/A' },
                ],
              },
            ],
          });
          success = res.success;
          errorMsg = res.error || null;
          break;
        }
        case 'EMAIL': {
          const res = await EmailConnector.sendEmail({
            to: dto.recipient,
            subject: `[Fricta Alert] ${dto.severity}: ${dto.alertType}`,
            textBody: `Operational Incident Alert triggered on Fricta.\n\nType: ${dto.alertType}\nSeverity: ${dto.severity}\nDetails: ${dto.message}\nLink: ${sessionUrl || 'N/A'}`,
            htmlBody: `
              <h2>Fricta Incident Alert</h2>
              <p><strong>Type:</strong> ${dto.alertType}</p>
              <p><strong>Severity:</strong> ${dto.severity}</p>
              <p><strong>Details:</strong> ${dto.message}</p>
              ${sessionUrl ? `<p><a href="${sessionUrl}">Investigate Replay Timeline</a></p>` : ''}
            `,
          });
          success = res.success;
          errorMsg = res.error || null;
          break;
        }
        default:
          errorMsg = 'Unknown escalation channel';
      }
    } catch (e: any) {
      success = false;
      errorMsg = e.message || 'Unknown integration error';
    }

    // Save escalation record in the database
    return prisma.alertEscalation.create({
      data: {
        alertId,
        channel: dto.channel,
        recipient: dto.recipient,
        status: success ? 'SENT' : 'FAILED',
        errorMessage: errorMsg,
      },
    });
  }
}
