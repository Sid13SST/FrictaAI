import { ActiveUserPresence } from '../types';

export class PresenceManager {
  private presenceMap = new Map<string, ActiveUserPresence>();
  private readonly PRESENCE_TIMEOUT_MS = 20 * 1000; // 20 seconds timeout

  /**
   * Heartbeats a user's presence on a particular screen.
   */
  updatePresence(userId: string, name: string, activeScreen: string): ActiveUserPresence {
    const presence: ActiveUserPresence = {
      userId,
      name,
      activeScreen,
      lastActive: new Date(),
    };

    this.presenceMap.set(userId, presence);
    return presence;
  }

  /**
   * Gets list of all active operators on a specific target screen.
   */
  getPresenceForScreen(activeScreen: string): ActiveUserPresence[] {
    this.cleanupStalePresence();
    return Array.from(this.presenceMap.values()).filter(
      (p) => p.activeScreen === activeScreen
    );
  }

  /**
   * Clears out any stale entries.
   */
  private cleanupStalePresence() {
    const now = Date.now();
    for (const [userId, record] of this.presenceMap.entries()) {
      if (now - record.lastActive.getTime() > this.PRESENCE_TIMEOUT_MS) {
        this.presenceMap.delete(userId);
      }
    }
  }

  /**
   * Retrieves all active presence states system-wide.
   */
  getAllPresence(): ActiveUserPresence[] {
    this.cleanupStalePresence();
    return Array.from(this.presenceMap.values());
  }

  /**
   * Removes a user explicitly (e.g. on disconnect).
   */
  removeUser(userId: string) {
    this.presenceMap.delete(userId);
  }
}
