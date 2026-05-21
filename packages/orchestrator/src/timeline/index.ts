import { PrismaClient } from '@fricta/db';

export type OrchestratorTimelineEventType = 
  | 'AGENT_SPAWNED'
  | 'TASK_DELEGATED'
  | 'ANALYSIS_STARTED'
  | 'FINDING_GENERATED'
  | 'SYNC_COMPLETED'
  | 'AGENT_FAILED'
  | 'RECOVERY_TRIGGERED'
  | 'ORCHESTRATION_COMPLETED';

export class TimelineRecorder {
  constructor(
    private prisma: PrismaClient,
    private orchestrationSessionId: string
  ) {}

  /**
   * Log an orchestration event. Inserts a record in the SharedContextEvent table with timeline classification.
   */
  async logEvent(eventType: OrchestratorTimelineEventType, payload: Record<string, any>) {
    console.log(`[TimelineRecorder] [${eventType}] ${payload.description || ''}`);
    return await this.prisma.sharedContextEvent.create({
      data: {
        orchestrationSessionId: this.orchestrationSessionId,
        eventType,
        payload
      }
    });
  }
}
