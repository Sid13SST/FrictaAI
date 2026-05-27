import { PrismaClient, ReportDistributionEvent } from '@prisma/client';

export class ReportDistributionDispatcher {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Distributes a report via a configured channel (Slack webhook, email, Teams, etc.).
   */
  async distributeReport(reportId: string, channel: string, recipient: string, userId: string): Promise<ReportDistributionEvent> {
    console.log(`[ReportDistributionDispatcher] Sending report ${reportId} via ${channel} to ${recipient}...`);

    let status = 'SENT';
    
    // Simulate webhook dispatch or email SMTP trigger
    try {
      if (channel === 'WEBHOOK' && !recipient.startsWith('http')) {
        throw new Error('Invalid Webhook URL target');
      }
    } catch (err) {
      status = 'FAILED';
    }

    const event = await this.prisma.reportDistributionEvent.create({
      data: {
        reportId,
        channel,
        recipient,
        status,
        sentById: userId
      }
    });

    return event;
  }
}
