export interface TeamsCardPayload {
  title: string;
  summary: string;
  themeColor: string;
  sections?: Array<{
    activityTitle?: string;
    activitySubtitle?: string;
    facts?: Array<{ name: string; value: string }>;
    text?: string;
  }>;
  potentialAction?: Array<{
    type: string;
    name: string;
    targets: Array<{ os: string; uri: string }>;
  }>;
}

export class TeamsConnector {
  /**
   * Simulates posting an actionable message card to a Microsoft Teams Incoming Webhook.
   */
  static async sendCard(
    webhookUrl: string,
    card: TeamsCardPayload
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`[TeamsConnector] Dispatching card to: ${webhookUrl}`);
    console.log(`[TeamsConnector] Payload:`, JSON.stringify(card, null, 2));

    if (!webhookUrl) {
      return { success: false, error: 'Teams webhook URL is required' };
    }

    await new Promise((resolve) => setTimeout(resolve, 50));

    return {
      success: true,
      messageId: `msg_teams_${Math.random().toString(36).substring(2, 11)}`,
    };
  }
}
