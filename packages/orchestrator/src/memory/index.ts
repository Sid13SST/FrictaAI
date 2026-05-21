import { PrismaClient } from '@fricta/db';

export class SharedContext {
  constructor(
    private prisma: PrismaClient,
    private orchestrationSessionId: string
  ) {}

  /**
   * Appends a new synchronization event containing evidence, findings, or signals.
   * Enforces immutability via append-only database operations.
   */
  async appendEvent(eventType: string, payload: any) {
    console.log(`[SharedContext] Syncing Event: ${eventType} for Session: ${this.orchestrationSessionId}`);
    return await this.prisma.sharedContextEvent.create({
      data: {
        orchestrationSessionId: this.orchestrationSessionId,
        eventType,
        payload: payload ?? {}
      }
    });
  }

  /**
   * Retrieves all shared context events chronologically.
   */
  async getEvents() {
    return await this.prisma.sharedContextEvent.findMany({
      where: { orchestrationSessionId: this.orchestrationSessionId },
      orderBy: { timestamp: 'asc' }
    });
  }
}
