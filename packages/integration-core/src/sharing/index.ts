import { prisma } from '@fricta/db';

export interface CreateShareTokenDto {
  projectId: string;
  workflowSessionId: string;
  sharedWithEmail?: string;
  notes?: string;
  expiresInDays?: number;
}

export class SharingManager {
  /**
   * Generates a sharing token for a specific Replay session.
   * If solo mode is active, this generates a token that works instantly.
   */
  static async createShareToken(dto: CreateShareTokenDto): Promise<any> {
    const shareToken = `fricta_share_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    
    let expiresAt: Date | null = null;
    if (dto.expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + dto.expiresInDays);
    }

    const sharedSession = await prisma.sharedReplaySession.create({
      data: {
        projectId: dto.projectId,
        workflowSessionId: dto.workflowSessionId,
        shareToken,
        sharedWithEmail: dto.sharedWithEmail || null,
        notes: dto.notes || null,
        expiresAt,
      },
    });

    // Record a collaboration event for accountability
    await prisma.collaborationEvent.create({
      data: {
        projectId: dto.projectId,
        roomType: 'REPLAY_SHARING',
        roomId: sharedSession.id,
        userEmail: dto.sharedWithEmail || 'solo_user@local.fricta.internal',
        actionType: 'JOINED',
        payload: {
          tokenGenerated: true,
          expiry: expiresAt,
        },
      },
    });

    return sharedSession;
  }

  /**
   * Validates a sharing token. Returns the session and project info if valid.
   */
  static async validateShareToken(shareToken: string): Promise<any> {
    const session = await prisma.sharedReplaySession.findUnique({
      where: { shareToken },
      include: {
        project: true,
        workflowSession: {
          include: {
            workflowScreenshots: true,
            uxFindings: true,
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    // Check expiry
    if (session.expiresAt && new Date() > session.expiresAt) {
      return null;
    }

    return session;
  }

  /**
   * Lists all active shared replay sessions for a project.
   */
  static async listSharedSessions(projectId: string): Promise<any[]> {
    return prisma.sharedReplaySession.findMany({
      where: { projectId },
      include: {
        workflowSession: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Revoke a sharing token.
   */
  static async revokeShareToken(tokenId: string): Promise<boolean> {
    await prisma.sharedReplaySession.delete({
      where: { id: tokenId },
    });
    return true;
  }
}
