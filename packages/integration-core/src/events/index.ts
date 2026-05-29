import { prisma } from '@fricta/db';
import { IntegrationProvider } from '../types';

/**
 * IntegrationEventEmitter — outgoing event routing for cross-tool intelligence propagation.
 * Routes Fricta operational intelligence events to the appropriate provider channels.
 */
export class IntegrationEventEmitter {
  static async emit(
    provider: IntegrationProvider,
    eventType: string,
    payload: Record<string, any>,
    workspaceId: string | null,
    integrationId?: string
  ): Promise<string> {
    const event = await prisma.integrationEvent.create({
      data: {
        workspaceIntegrationId: integrationId,
        workspaceId,
        provider,
        direction: 'OUTGOING',
        eventType,
        status: 'PROCESSED',
        payload,
        processedAt: new Date()
      }
    });
    return event.id;
  }

  static async getTimeline(workspaceId: string | null, limit = 100): Promise<any[]> {
    return prisma.integrationEvent.findMany({
      where: { workspaceId: workspaceId ?? null },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
}
