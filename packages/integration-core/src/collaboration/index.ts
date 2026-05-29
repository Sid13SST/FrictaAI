import { prisma } from '@fricta/db';
import { RealtimeSyncManager } from '../realtime-sync';

export interface RoomActionDto {
  projectId: string;
  roomType: 'INVESTIGATION' | 'REPLAY_SHARING';
  roomId: string;
  userEmail: string;
  actionType: 'JOINED' | 'SCRUBBED' | 'ANNOTATED' | 'ESCALATED';
  payload?: any;
}

export class CollaborationManager {
  /**
   * Records a user's action in a shared collaboration room (e.g. joining or scrubbing the timeline).
   * Also broadcasts this activity via the realtime bus.
   */
  static async recordRoomActivity(dto: RoomActionDto): Promise<any> {
    const log = await prisma.collaborationEvent.create({
      data: {
        projectId: dto.projectId,
        roomType: dto.roomType,
        roomId: dto.roomId,
        userEmail: dto.userEmail,
        actionType: dto.actionType,
        payload: dto.payload || {},
      },
    });

    // Broadcast in real-time
    if (dto.actionType === 'SCRUBBED') {
      await RealtimeSyncManager.broadcastScrub(dto.roomId, dto.userEmail, dto.payload?.stepIndex || 0);
    } else if (dto.actionType === 'JOINED') {
      await RealtimeSyncManager.broadcastPresence(dto.roomId, dto.userEmail, 'online');
    }

    return log;
  }

  /**
   * Retrieves active history logs of collaboration activities in a room.
   */
  static async getRoomActivityLogs(roomId: string): Promise<any[]> {
    return prisma.collaborationEvent.findMany({
      where: { roomId },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
  }
}
