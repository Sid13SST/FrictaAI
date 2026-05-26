import { PrismaClient } from '@fricta/db';
import { ActiveUserPresence } from '../types';

export class CollaborationManager {
  // In-memory fallback if Redis is not directly imported here, though Redis can be queried.
  private static presenceMap = new Map<string, Map<string, ActiveUserPresence>>();

  constructor(private prisma: PrismaClient) {}

  /**
   * Shares a workflow session as a collaborative workspace investigation.
   */
  async shareInvestigation(
    workspaceId: string,
    workflowSessionId: string,
    name: string,
    description: string | null,
    userId: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      const investigation = await tx.sharedInvestigation.create({
        data: {
          workspaceId,
          workflowSessionId,
          name,
          description,
          createdById: userId,
        },
      });

      await tx.workspaceActivity.create({
        data: {
          workspaceId,
          userId,
          actionType: 'INVESTIGATION_SHARED',
          description: `Shared session investigation: "${name}"`,
          metadata: { investigationId: investigation.id, workflowSessionId },
        },
      });

      return investigation;
    });
  }

  /**
   * Lists all shared investigations in a workspace.
   */
  async getWorkspaceInvestigations(workspaceId: string) {
    return this.prisma.sharedInvestigation.findMany({
      where: { workspaceId },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        workflowSession: {
          select: {
            id: true,
            status: true,
            stepCount: true,
            createdAt: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Adds a comment to a shared investigation review thread.
   */
  async addComment(sharedInvestigationId: string, userId: string, content: string) {
    if (!content || content.trim() === '') {
      throw new Error('Comment content cannot be empty');
    }

    return this.prisma.investigationComment.create({
      data: {
        sharedInvestigationId,
        userId,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Fetches comment threads for a shared investigation.
   */
  async getInvestigationComments(sharedInvestigationId: string) {
    return this.prisma.investigationComment.findMany({
      where: { sharedInvestigationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Presence: Updates user active screen and cursor details.
   */
  updatePresence(
    workspaceId: string,
    userId: string,
    name: string,
    activeScreen: string,
    cursor?: { x: number; y: number }
  ): ActiveUserPresence {
    if (!CollaborationManager.presenceMap.has(workspaceId)) {
      CollaborationManager.presenceMap.set(workspaceId, new Map());
    }

    const wsPresence = CollaborationManager.presenceMap.get(workspaceId)!;
    const presence: ActiveUserPresence = {
      userId,
      name,
      activeScreen,
      lastActive: new Date(),
      cursor,
    };

    wsPresence.set(userId, presence);
    return presence;
  }

  /**
   * Presence: Retrieves all active members in a workspace (last 2 minutes).
   */
  getWorkspacePresence(workspaceId: string): ActiveUserPresence[] {
    const wsPresence = CollaborationManager.presenceMap.get(workspaceId);
    if (!wsPresence) return [];

    const now = Date.now();
    const activeThreshold = 2 * 60 * 1000; // 2 minutes

    const results: ActiveUserPresence[] = [];
    for (const [userId, presence] of wsPresence.entries()) {
      if (now - presence.lastActive.getTime() < activeThreshold) {
        results.push(presence);
      } else {
        wsPresence.delete(userId); // cleanup stale
      }
    }

    return results;
  }
}
