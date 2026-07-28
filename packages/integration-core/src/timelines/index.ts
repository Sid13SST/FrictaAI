import { prisma } from '@fricta/db';
import { IntegrationProvider } from '../types';

/**
 * IntegrationTimeline — cross-tool event correlation and chronological feed.
 * Builds a unified timeline of all integration operations preserving replay lineage.
 */
export class IntegrationTimeline {
  static async getUnifiedTimeline(
    workspaceId: string | null,
    userId: string | null,
    projectId?: string,
    provider?: IntegrationProvider,
    limit = 100
  ): Promise<{ events: any[]; replayLinks: any[]; attachments: any[] }> {
    const [events, replayLinks, attachments] = await Promise.all([
      prisma.integrationEvent.findMany({
        where: {
          // Solo mode: events aren't tagged with a userId directly, so scope
          // via their parent integration's owner instead. Events with no
          // linked integration (e.g. bare webhooks) are excluded rather than
          // shown to everyone.
          ...(workspaceId ? { workspaceId } : { workspaceId: null, integration: { userId } }),
          ...(provider ? { provider } : {})
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      }),
      projectId ? prisma.replayLink.findMany({
        where: {
          projectId,
          ...(provider ? { provider } : {})
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      }) : Promise.resolve([]),
      projectId ? prisma.evidenceAttachment.findMany({
        where: {
          projectId,
          ...(provider ? { provider } : {})
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      }) : Promise.resolve([])
    ]);

    return { events, replayLinks, attachments };
  }
}
