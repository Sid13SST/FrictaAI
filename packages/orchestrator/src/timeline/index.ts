import { PrismaClient } from '@fricta/db';
import { RealtimeEventBus } from '@fricta/realtime';

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
    
    const result = await this.prisma.sharedContextEvent.create({
      data: {
        orchestrationSessionId: this.orchestrationSessionId,
        eventType,
        payload
      }
    });

    try {
      RealtimeEventBus.getInstance().publish({
        timestamp: new Date().toISOString(),
        orchestrationSessionId: this.orchestrationSessionId,
        eventType: 'delegation.triggered',
        payload: {
          fromAgent: payload.fromAgent || 'UX_ORCHESTRATOR',
          toAgent: payload.toAgent || payload.agentType || 'ALL',
          eventType,
          payload
        }
      });
    } catch (err) {
      console.error('[TimelineRecorder] Failed to publish delegation event to realtime event bus:', err);
    }

    return result;
  }
}
