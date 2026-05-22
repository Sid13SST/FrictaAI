export class PresenceTracker {
  private static instance: PresenceTracker;
  private sessionViewers = new Map<string, Set<string>>();

  private constructor() {}

  public static getInstance(): PresenceTracker {
    if (!PresenceTracker.instance) {
      PresenceTracker.instance = new PresenceTracker();
    }
    return PresenceTracker.instance;
  }

  /**
   * Register a user observing an active session.
   */
  public joinSession(sessionId: string, clientId: string): void {
    if (!this.sessionViewers.has(sessionId)) {
      this.sessionViewers.set(sessionId, new Set());
    }
    this.sessionViewers.get(sessionId)!.add(clientId);
    console.log(`[PresenceTracker] Client ${clientId} joined session ${sessionId}. Active viewers: ${this.getViewerCount(sessionId)}`);
  }

  /**
   * Deregister a user observing an active session.
   */
  public leaveSession(sessionId: string, clientId: string): void {
    const viewers = this.sessionViewers.get(sessionId);
    if (viewers) {
      viewers.delete(clientId);
      if (viewers.size === 0) {
        this.sessionViewers.delete(sessionId);
      }
    }
    console.log(`[PresenceTracker] Client ${clientId} left session ${sessionId}. Active viewers: ${this.getViewerCount(sessionId)}`);
  }

  /**
   * Get active observer count for a session.
   */
  public getViewerCount(sessionId: string): number {
    return this.sessionViewers.get(sessionId)?.size ?? 0;
  }
}
