export interface SlackAlertPayload {
  title: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  sessionUrl?: string;
  timestamp: Date;
}

export class SlackConnector {
  /**
   * Simulates sending a rich interactive markdown alert to a Slack channel webhook.
   * If a real webhook URL starting with 'http' is provided, we can simulate HTTP dispatch.
   */
  static async sendAlert(
    webhookUrl: string,
    alert: SlackAlertPayload
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`[SlackConnector] Dispatching alert to: ${webhookUrl}`);
    console.log(`[SlackConnector] Content:`, JSON.stringify(alert, null, 2));

    if (!webhookUrl) {
      return { success: false, error: 'Webhook URL is required' };
    }

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Solo mode fallback / check
    if (webhookUrl.includes('mock-slack-url') || webhookUrl.startsWith('mock:')) {
      return {
        success: true,
        messageId: `msg_slack_${Math.random().toString(36).substring(2, 11)}`,
      };
    }

    return {
      success: true,
      messageId: `msg_slack_${Date.now()}`,
    };
  }

  /**
   * Simulates posting a collaborative investigation thread reply back to Slack.
   */
  static async postThreadUpdate(
    webhookUrl: string,
    threadTitle: string,
    author: string,
    comment: string
  ): Promise<{ success: boolean; error?: string }> {
    console.log(`[SlackConnector] Posting thread update on "${threadTitle}" to ${webhookUrl}`);
    
    await new Promise((resolve) => setTimeout(resolve, 30));

    return { success: true };
  }
}
