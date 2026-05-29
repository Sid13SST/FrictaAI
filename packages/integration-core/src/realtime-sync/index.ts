import { RealtimeEventBus } from '@fricta/realtime';

export class RealtimeSyncManager {
  /**
   * Broadcasts user presence updates in a shared room.
   */
  static async broadcastPresence(
    roomId: string,
    userEmail: string,
    status: 'online' | 'offline' | 'away'
  ): Promise<void> {
    console.log(`[RealtimeSyncManager] Broadcasting presence: ${userEmail} is ${status} in room ${roomId}`);
    
    RealtimeEventBus.getInstance().publish({
      orchestrationSessionId: roomId, // roomId acts as the streaming channel context
      eventType: 'collab.presence',
      payload: {
        userEmail,
        status,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Broadcasts a user's playback timeline scrub position in a shared replay.
   */
  static async broadcastScrub(
    roomId: string,
    userEmail: string,
    stepIndex: number
  ): Promise<void> {
    console.log(`[RealtimeSyncManager] Broadcasting scrub: ${userEmail} is at step ${stepIndex} in room ${roomId}`);
    
    RealtimeEventBus.getInstance().publish({
      orchestrationSessionId: roomId,
      eventType: 'collab.scrub',
      payload: {
        userEmail,
        stepIndex,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Broadcasts an annotation created in real-time.
   */
  static async broadcastAnnotation(
    roomId: string,
    author: string,
    comment: string
  ): Promise<void> {
    console.log(`[RealtimeSyncManager] Broadcasting annotation by ${author} in room ${roomId}`);
    
    RealtimeEventBus.getInstance().publish({
      orchestrationSessionId: roomId,
      eventType: 'collab.annotation',
      payload: {
        author,
        comment,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
