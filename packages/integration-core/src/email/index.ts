export interface EmailPayload {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}

export class EmailConnector {
  /**
   * Simulates sending a transactional email to a user (e.g. for digests or critical alerts).
   */
  static async sendEmail(
    email: EmailPayload
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`[EmailConnector] Sending email to: ${email.to}`);
    console.log(`[EmailConnector] Subject: ${email.subject}`);
    console.log(`[EmailConnector] Body preview: ${email.textBody.substring(0, 150)}...`);

    if (!email.to || !email.to.includes('@')) {
      return { success: false, error: 'Invalid recipient email address' };
    }

    await new Promise((resolve) => setTimeout(resolve, 50));

    return {
      success: true,
      messageId: `email_${Math.random().toString(36).substring(2, 11)}`,
    };
  }
}
