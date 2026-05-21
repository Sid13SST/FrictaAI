import { PrismaClient } from '@fricta/db';
import { SharedMemoryStorage } from '../storage';

export class SharedMemoryContext {
  private storage: SharedMemoryStorage;

  constructor(
    private prisma: PrismaClient,
    private orchestrationSessionId: string
  ) {
    this.storage = new SharedMemoryStorage(prisma, orchestrationSessionId);
  }

  /**
   * Compiles the current orchestration session state and saves it as an immutable memory snapshot.
   */
  async createMilestoneSnapshot(snapshotType: string): Promise<any> {
    const sessionId = this.orchestrationSessionId;

    // Fetch executions, findings, and signals compiled so far
    const executions = await this.prisma.agentExecution.findMany({
      where: { orchestrationSessionId: sessionId },
      include: {
        findings: true,
        signals: true,
        reasoningTraces: true
      }
    });

    const payload = {
      timestamp: new Date().toISOString(),
      agentExecutions: executions.map(exec => ({
        id: exec.id,
        agentType: exec.agentType,
        status: exec.status,
        findingsCount: exec.findings.length,
        signals: exec.signals.map(s => ({ type: s.signalType, intensity: s.intensity })),
        tracesCount: exec.reasoningTraces.length
      }))
    };

    await this.storage.saveSnapshot({
      snapshotType,
      payload
    });

    return payload;
  }
}
