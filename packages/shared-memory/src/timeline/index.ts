import { PrismaClient } from '@fricta/db';

export interface TimelineItem {
  id: string;
  type: 'EVENT' | 'TRACE' | 'SNAPSHOT';
  timestamp: Date;
  source: string;
  title: string;
  description: string;
  payload?: any;
}

export class SharedMemoryTimelineCompiler {
  constructor(
    private prisma: PrismaClient,
    private orchestrationSessionId: string
  ) {}

  /**
   * Compiles chronological activity events, reasoning steps, and milestones
   * into a single unified trace stream for visualization.
   */
  async compileTimeline(): Promise<TimelineItem[]> {
    const sessionId = this.orchestrationSessionId;

    // 1. Fetch Shared Memory Events
    const events = await this.prisma.sharedMemoryEvent.findMany({
      where: { orchestrationSessionId: sessionId },
      orderBy: { timestamp: 'asc' }
    });

    // 2. Fetch Agent Reasoning Traces
    const executions = await this.prisma.agentExecution.findMany({
      where: { orchestrationSessionId: sessionId },
      include: {
        reasoningTraces: true
      }
    });

    const traces = executions.flatMap(exec => 
      exec.reasoningTraces.map(t => ({
        ...t,
        agentType: exec.agentType
      }))
    );

    // 3. Fetch Memory Snapshots
    const snapshots = await this.prisma.memorySnapshot.findMany({
      where: { orchestrationSessionId: sessionId },
      orderBy: { createdAt: 'asc' }
    });

    const items: TimelineItem[] = [];

    // Map Events
    for (const e of events) {
      items.push({
        id: `event-${e.id}`,
        type: 'EVENT',
        timestamp: e.timestamp,
        source: e.sourceAgent,
        title: e.eventType,
        description: typeof e.payload === 'object' && e.payload && (e.payload as any).description 
          ? (e.payload as any).description 
          : JSON.stringify(e.payload),
        payload: e.payload
      });
    }

    // Map Traces
    for (const t of traces) {
      items.push({
        id: `trace-${t.id}`,
        type: 'TRACE',
        timestamp: t.timestamp,
        source: t.agentType,
        title: `Reasoning Step: ${t.stepType}`,
        description: t.summary,
        payload: t.evidence ? { evidence: t.evidence } : null
      });
    }

    // Map Snapshots
    for (const s of snapshots) {
      items.push({
        id: `snapshot-${s.id}`,
        type: 'SNAPSHOT',
        timestamp: s.createdAt,
        source: 'SYSTEM',
        title: `Memory Snapshot: ${s.snapshotType}`,
        description: 'Immutable snapshot of session state and agent metrics compiled.',
        payload: s.payload
      });
    }

    // Sort by timestamp asc
    return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}
