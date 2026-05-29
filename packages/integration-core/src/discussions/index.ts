import { prisma } from '@fricta/db';

export class DiscussionManager {
  /**
   * Records a general room message or retrieves general discussion comments for active investigations.
   */
  static async listCollaborationLogs(projectId: string): Promise<any[]> {
    return prisma.collaborationEvent.findMany({
      where: { projectId },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
  }

  /**
   * Clears old/historical logs of team collaboration events for audit limits.
   */
  static async logRoomActivity(
    projectId: string,
    roomType: 'INVESTIGATION' | 'REPLAY_SHARING',
    roomId: string,
    userEmail: string,
    actionType: 'JOINED' | 'SCRUBBED' | 'ANNOTATED' | 'ESCALATED',
    payload?: any
  ): Promise<any> {
    return prisma.collaborationEvent.create({
      data: {
        projectId,
        roomType,
        roomId,
        userEmail,
        actionType,
        payload: payload || {},
      },
    });
  }
}
