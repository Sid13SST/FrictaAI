import { PrismaClient } from '@fricta/db';
import * as crypto from 'crypto';

export class SharingManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generates a secure tokenized shareable link for a report, replay, or session.
   */
  async createSharedLink(params: {
    projectId: string;
    targetType: 'INVESTIGATION' | 'REPORT' | 'REPLAY' | 'SUMMARY';
    targetId: string;
    createdById: string;
    expiresInHours?: number;
    maxUses?: number;
  }) {
    const token = crypto.randomBytes(24).toString('hex');
    let expiresAt: Date | null = null;

    if (params.expiresInHours) {
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + params.expiresInHours);
    }

    return this.prisma.sharedLink.create({
      data: {
        projectId: params.projectId,
        targetType: params.targetType,
        targetId: params.targetId,
        token,
        expiresAt,
        maxUses: params.maxUses || null,
        createdById: params.createdById,
      },
    });
  }

  /**
   * Validates a share link token. If valid, increments use counts.
   */
  async validateSharedLink(token: string) {
    const link = await this.prisma.sharedLink.findUnique({
      where: { token },
    });

    if (!link) {
      return { isValid: false, reason: 'Link not found' };
    }

    // Check expiry
    if (link.expiresAt && new Date() > link.expiresAt) {
      return { isValid: false, reason: 'Link expired' };
    }

    // Check use limits
    if (link.maxUses && link.useCount >= link.maxUses) {
      return { isValid: false, reason: 'Usage limit reached' };
    }

    // Increment count
    await this.prisma.sharedLink.update({
      where: { id: link.id },
      data: { useCount: { increment: 1 } },
    });

    return { isValid: true, link };
  }
}
