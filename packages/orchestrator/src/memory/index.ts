import { PrismaClient } from '@fricta/db';
import { 
  SharedMemoryStorage, 
  SharedMemoryContext, 
  SharedMemoryEventInput,
  MemorySnapshotInput
} from '@fricta/shared-memory';

export class SharedContext {
  private storage: SharedMemoryStorage;
  private memoryContext: SharedMemoryContext;

  constructor(
    private prisma: PrismaClient,
    private orchestrationSessionId: string
  ) {
    this.storage = new SharedMemoryStorage(prisma, orchestrationSessionId);
    this.memoryContext = new SharedMemoryContext(prisma, orchestrationSessionId);
  }

  /**
   * Appends a new synchronization event containing evidence, findings, or signals (Phase 6 Part 2 legacy).
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
   * Retrieves all shared context events chronologically (Phase 6 Part 2 legacy).
   */
  async getEvents() {
    return await this.prisma.sharedContextEvent.findMany({
      where: { orchestrationSessionId: this.orchestrationSessionId },
      orderBy: { timestamp: 'asc' }
    });
  }

  // --- Phase 6 Part 3 New Shared Memory Methods ---

  /**
   * Cleans all prior shared memory entries for this session.
   */
  async clearMemory(): Promise<void> {
    await this.storage.clearSessionMemory();
  }

  /**
   * Appends an event to the chronological memory stream.
   */
  async appendMemoryEvent(input: SharedMemoryEventInput) {
    return await this.storage.appendEvent(input);
  }

  /**
   * Retrieves all shared memory events chronologically.
   */
  async getMemoryEvents() {
    return await this.storage.getEvents();
  }

  /**
   * Saves an immutable memory snapshot.
   */
  async saveMemorySnapshot(input: MemorySnapshotInput) {
    return await this.storage.saveSnapshot(input);
  }

  /**
   * Compiles the current session state and saves it as a milestone snapshot.
   */
  async createMilestoneSnapshot(snapshotType: string): Promise<any> {
    return await this.memoryContext.createMilestoneSnapshot(snapshotType);
  }

  /**
   * Retrieves memory snapshots for this session.
   */
  async getMemorySnapshots() {
    return await this.storage.getSnapshots();
  }

  /**
   * Retrieves correlated findings.
   */
  async getMemoryCorrelations() {
    return await this.storage.getCorrelations();
  }

  /**
   * Retrieves collaborative insights.
   */
  async getMemoryInsights() {
    return await this.storage.getInsights();
  }
}

