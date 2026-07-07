import { PrismaClient } from '@fricta/db';
import { 
  SharedMemoryEventInput, 
  CorrelatedFindingInput, 
  CollaborativeInsightInput, 
  MemorySnapshotInput 
} from '../types';
import { RealtimeEventBus } from '@fricta/realtime';

export class SharedMemoryStorage {
  constructor(
    private prisma: PrismaClient,
    private orchestrationSessionId: string
  ) {}

  /**
   * Cleans all prior telemetry and shared memory entries for this session.
   * Ensures idempotency and clean re-runs.
   */
  async clearSessionMemory(): Promise<void> {
    const sessionId = this.orchestrationSessionId;
    await this.prisma.$transaction([
      this.prisma.sharedMemoryEvent.deleteMany({ where: { orchestrationSessionId: sessionId } }),
      this.prisma.correlatedFinding.deleteMany({ where: { orchestrationSessionId: sessionId } }),
      this.prisma.collaborativeInsight.deleteMany({ where: { orchestrationSessionId: sessionId } }),
      this.prisma.memorySnapshot.deleteMany({ where: { orchestrationSessionId: sessionId } }),
    ]);
  }

  /**
   * Appends an event to the chronological memory stream.
   */
  async appendEvent(input: SharedMemoryEventInput) {
    const event = await this.prisma.sharedMemoryEvent.create({
      data: {
        orchestrationSessionId: this.orchestrationSessionId,
        eventType: input.eventType,
        sourceAgent: input.sourceAgent,
        payload: input.payload ?? {}
      }
    });

    try {
      RealtimeEventBus.getInstance().publish({
        timestamp: event.timestamp.toISOString(),
        orchestrationSessionId: this.orchestrationSessionId,
        eventType: 'memory.updated',
        payload: {
          id: event.id,
          eventType: event.eventType,
          sourceAgent: event.sourceAgent,
          payload: event.payload,
          timestamp: event.timestamp.toISOString()
        }
      });
    } catch (err) {
      console.error('[SharedMemoryStorage] Failed to publish memory.updated event:', err);
    }

    return event;
  }

  /**
   * Retrieves all shared memory events chronologically.
   */
  async getEvents() {
    return await this.prisma.sharedMemoryEvent.findMany({
      where: { orchestrationSessionId: this.orchestrationSessionId },
      orderBy: { timestamp: 'asc' }
    });
  }

  /**
   * Saves an immutable memory snapshot.
   */
  async saveSnapshot(input: MemorySnapshotInput) {
    return await this.prisma.memorySnapshot.create({
      data: {
        orchestrationSessionId: this.orchestrationSessionId,
        snapshotType: input.snapshotType,
        payload: input.payload ?? {}
      }
    });
  }

  /**
   * Retrieves snapshots for this session.
   */
  async getSnapshots() {
    return await this.prisma.memorySnapshot.findMany({
      where: { orchestrationSessionId: this.orchestrationSessionId },
      orderBy: { createdAt: 'asc' }
    });
  }

  /**
   * Saves correlated findings detected by the correlation engine.
   */
  async saveCorrelatedFindings(correlations: CorrelatedFindingInput[]) {
    if (correlations.length === 0) return;
    
    for (const c of correlations) {
      const record = await this.prisma.correlatedFinding.create({
        data: {
          orchestrationSessionId: this.orchestrationSessionId,
          findingIds: c.findingIds,
          correlationType: c.correlationType,
          summary: c.summary,
          confidence: c.confidence,
          metadata: c.metadata ? c.metadata : undefined
        }
      });

      try {
        RealtimeEventBus.getInstance().publish({
          timestamp: record.timestamp.toISOString(),
          orchestrationSessionId: this.orchestrationSessionId,
          eventType: 'correlation.generated',
          payload: {
            correlationId: record.id,
            findingIds: record.findingIds as string[],
            correlationType: record.correlationType,
            summary: record.summary,
            confidence: record.confidence,
            metadata: record.metadata
          }
        });
      } catch (err) {
        console.error('[SharedMemoryStorage] Failed to publish correlation.generated event:', err);
      }
    }
  }

  /**
   * Retrieves correlated findings.
   */
  async getCorrelations() {
    return await this.prisma.correlatedFinding.findMany({
      where: { orchestrationSessionId: this.orchestrationSessionId },
      orderBy: { timestamp: 'asc' }
    });
  }

  /**
   * Saves collaborative insights synthesized across multiple agents.
   */
  async saveCollaborativeInsights(insights: CollaborativeInsightInput[]) {
    if (insights.length === 0) return;

    for (const i of insights) {
      const record = await this.prisma.collaborativeInsight.create({
        data: {
          orchestrationSessionId: this.orchestrationSessionId,
          title: i.title,
          summary: i.summary,
          supportingEvidence: i.supportingEvidence,
          severity: i.severity,
          confidence: i.confidence
        }
      });

      try {
        RealtimeEventBus.getInstance().publish({
          timestamp: record.timestamp.toISOString(),
          orchestrationSessionId: this.orchestrationSessionId,
          eventType: 'insight.generated',
          payload: {
            insightId: record.id,
            title: record.title,
            summary: record.summary,
            supportingEvidence: record.supportingEvidence,
            severity: record.severity,
            confidence: record.confidence
          }
        });
      } catch (err) {
        console.error('[SharedMemoryStorage] Failed to publish insight.generated event:', err);
      }
    }
  }

  /**
   * Retrieves collaborative insights.
   */
  async getInsights() {
    return await this.prisma.collaborativeInsight.findMany({
      where: { orchestrationSessionId: this.orchestrationSessionId },
      orderBy: { timestamp: 'asc' }
    });
  }
}
