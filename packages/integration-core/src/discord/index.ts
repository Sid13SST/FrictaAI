export interface DiscordEmbedPayload {
  title: string;
  description: string;
  color: number; // Decimal color code
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  url?: string;
  timestamp: Date;
}

export class DiscordConnector {
  /**
   * Simulates dispatching a rich embedded message to a Discord channel webhook.
   */
  static async sendEmbed(
    webhookUrl: string,
    embed: DiscordEmbedPayload
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`[DiscordConnector] Dispatching embed to: ${webhookUrl}`);
    console.log(`[DiscordConnector] Payload:`, JSON.stringify(embed, null, 2));

    if (!webhookUrl) {
      return { success: false, error: 'Discord webhook URL is required' };
    }

    await new Promise((resolve) => setTimeout(resolve, 50));

    return {
      success: true,
      messageId: `msg_discord_${Math.random().toString(36).substring(2, 11)}`,
    };
  }

  /**
   * Translates an alert to Discord embed format.
   */
  static getEmbedColorForSeverity(severity: string): number {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return 16711680; // Red
      case 'HIGH':
        return 16744192; // Orange
      case 'MEDIUM':
        return 16776960; // Yellow
      default:
        return 65280; // Green / Low
    }
  }
}
