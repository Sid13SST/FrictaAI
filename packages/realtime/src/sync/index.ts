export class RealtimeSyncRegistry {
  private static instance: RealtimeSyncRegistry;
  private activeSyncSessions = new Set<string>();

  private constructor() {}

  public static getInstance(): RealtimeSyncRegistry {
    if (!RealtimeSyncRegistry.instance) {
      RealtimeSyncRegistry.instance = new RealtimeSyncRegistry();
    }
    return RealtimeSyncRegistry.instance;
  }

  public registerSession(sessionId: string): void {
    this.activeSyncSessions.add(sessionId);
  }

  public deregisterSession(sessionId: string): void {
    this.activeSyncSessions.delete(sessionId);
  }

  public isSessionActive(sessionId: string): boolean {
    return this.activeSyncSessions.has(sessionId);
  }
}
