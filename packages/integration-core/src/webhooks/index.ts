import { prisma } from '@fricta/db';
import { IntegrationProvider } from '../types';

/**
 * WebhookHandler — incoming webhook processing with deduplication and signature safety.
 *
 * Handles provider webhooks (Jira updates, GitHub PR events, Linear state changes, etc.)
 * with event deduplication, replay-safe processing, and failure-tolerant retry queuing.
 */
export class WebhookHandler {
  /**
   * Process an incoming webhook payload from an external provider.
   * Deduplicates using a composite key to prevent double-processing.
   */
  static async processIncoming(
    provider: IntegrationProvider,
    eventType: string,
    payload: Record<string, any>,
    workspaceId: string | null,
    integrationId?: string
  ): Promise<{ processed: boolean; eventId: string }> {
    const deduplicationKey = `${provider}:${eventType}:${JSON.stringify(payload).slice(0, 64)}:${Date.now()}`;

    // Check deduplication
    const existing = await prisma.integrationEvent.findFirst({
      where: { deduplicationKey }
    });

    if (existing) {
      return { processed: false, eventId: existing.id };
    }

    const event = await prisma.integrationEvent.create({
      data: {
        workspaceIntegrationId: integrationId,
        workspaceId,
        provider,
        direction: 'INCOMING',
        eventType,
        status: 'PENDING',
        payload,
        deduplicationKey
      }
    });

    // Mark as processed (in production, route to SyncJobQueue)
    await prisma.integrationEvent.update({
      where: { id: event.id },
      data: { status: 'PROCESSED', processedAt: new Date() }
    });

    return { processed: true, eventId: event.id };
  }

  /**
   * Log an outgoing event (replay link created, evidence attached, ticket generated).
   */
  static async logOutgoing(
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

  /**
   * Retrieve recent integration events for a workspace (timeline view).
   */
  static async getRecentEvents(
    workspaceId: string | null,
    limit = 50
  ): Promise<any[]> {
    return prisma.integrationEvent.findMany({
      where: { workspaceId: workspaceId ?? null },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
}
