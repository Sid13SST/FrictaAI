import { PrismaClient } from '@fricta/db';
import { TimelineEventPayload } from '../types';

export class VisualTimelineManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generates a timeline event record in the database
   */
  async createTimelineEvent(payload: TimelineEventPayload) {
    return await this.prisma.screenshotTimelineEvent.create({
      data: {
        workflowSessionId: payload.workflowSessionId,
        screenshotId: payload.screenshotId,
        actionId: payload.actionId || null,
        thoughtId: payload.thoughtId || null,
        eventType: payload.eventType,
        timestamp: payload.timestamp || new Date(),
      },
    });
  }

  /**
   * Retrieves a synchronized visual timeline for a session
   */
  async getSessionTimeline(sessionId: string) {
    const screenshots = await this.prisma.workflowScreenshot.findMany({
      where: { workflowSessionId: sessionId },
      orderBy: { stepIndex: 'asc' },
    });

    const events = await this.prisma.screenshotTimelineEvent.findMany({
      where: { workflowSessionId: sessionId },
      orderBy: { timestamp: 'asc' },
    });

    const actions = await this.prisma.agentAction.findMany({
      where: { workflowSessionId: sessionId },
      orderBy: { stepNumber: 'asc' },
    });

    const thoughts = await this.prisma.agentThought.findMany({
      where: { workflowSessionId: sessionId },
      orderBy: { stepNumber: 'asc' },
    });

    const signals = await this.prisma.uXSignal.findMany({
      where: { workflowSessionId: sessionId },
      orderBy: { timestamp: 'asc' },
    });

    return {
      screenshots,
      events,
      actions,
      thoughts,
      signals,
    };
  }
}
