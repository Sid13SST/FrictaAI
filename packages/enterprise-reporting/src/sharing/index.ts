import { PrismaClient, SharedReport } from '@fricta/db';
import * as crypto from 'crypto';

export class SharedReportManager {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Generates a new secure tokenized shared report link.
   */
  async generateShare(reportId: string, userId: string, options: { expiresHours?: number; maxUses?: number; email?: string } = {}): Promise<SharedReport> {
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = options.expiresHours ? new Date(Date.now() + options.expiresHours * 60 * 60 * 1000) : null;

    return this.prisma.sharedReport.create({
      data: {
        reportId,
        token,
        expiresAt,
        maxUses: options.maxUses || null,
        recipientEmail: options.email || null,
        createdById: userId
      }
    });
  }

  /**
   * Resolves and verifies a shared report token.
   */
  async verifyShare(token: string): Promise<SharedReport | null> {
    const share = await this.prisma.sharedReport.findUnique({
      where: { token }
    });

    if (!share) return null;

    // Check expiry
    if (share.expiresAt && new Date() > share.expiresAt) {
      return null;
    }

    // Check use limits
    if (share.maxUses && share.useCount >= share.maxUses) {
      return null;
    }

    // Increment use count
    return this.prisma.sharedReport.update({
      where: { id: share.id },
      data: { useCount: { increment: 1 } }
    });
  }

  /**
   * Revokes a shared report token.
   */
  async revokeShare(shareId: string): Promise<boolean> {
    await this.prisma.sharedReport.delete({
      where: { id: shareId }
    });
    return true;
  }
}
