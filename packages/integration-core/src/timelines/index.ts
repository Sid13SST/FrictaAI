import { prisma } from '@fricta/db';
import { IntegrationProvider } from '../types';

/**
 * IntegrationTimeline — cross-tool event correlation and chronological feed.
 * Builds a unified timeline of all integration operations preserving replay lineage.
 */
export class IntegrationTimeline {
  static async getUnifiedTimeline(
    workspaceId: string | null,
    projectId?: string,
    provider?: IntegrationProvider,
    limit = 100
  ): Promise<{ events: any[]; replayLinks: any[]; attachments: any[] }> {
    const [events, replayLinks, attachments] = await Promise.all([
      prisma.integrationEvent.findMany({
        where: {
          workspaceId: workspaceId ?? null,
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
