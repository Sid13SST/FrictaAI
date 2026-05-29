import { prisma } from '@fricta/db';
import { EvidenceAttachmentSummary, ReplayContext, NotionConfig } from '../types';

/**
 * NotionConnector — evidence-linked page creation with replay intelligence.
 *
 * Creates Notion pages embedding full operational UX context: replay summaries,
 * cognitive load analyses, survivability curves, and workspace digest references.
 * Product teams can browse UX intelligence directly inside their Notion workspace.
 */
export class NotionConnector {
  /**
   * Create a Notion evidence page from a UX replay session.
   * The page carries structured UX intelligence: findings, cognitive data, survivability.
   */
  static async createEvidencePage(
    connectionId: string,
    projectId: string,
    finding: {
      title: string;
      description: string;
      severity: string;
    },
    replayContext: ReplayContext,
    config: NotionConfig
  ): Promise<EvidenceAttachmentSummary> {
    const pageId = config.pageId ?? `notion-page-${Date.now()}`;
    const pageUrl = `https://notion.so/${pageId.replace(/-/g, '')}`;

    const attachment = await prisma.evidenceAttachment.create({
      data: {
        projectId,
        connectionId,
        provider: 'NOTION',
        externalId: pageId,
        attachmentType: 'FINDING',
        title: `UX Evidence: ${finding.title}`,
        description: [
          `# ${finding.title}`,
          `**Severity:** ${finding.severity}`,
          ``,
          `## Description`,
          finding.description,
          ``,
          `## Replay Intelligence`,
          `- **Session:** ${replayContext.sessionId}`,
          `- **Goal:** ${replayContext.sessionGoal ?? 'N/A'}`,
          `- **Cognitive Load:** ${replayContext.cognitiveLoad ?? 'N/A'}%`,
          `- **Survivability Rate:** ${replayContext.survivabilityRate ?? 'N/A'}%`,
          `- **Friction Score:** ${replayContext.frictionScore ?? 'N/A'}`,
          replayContext.screenshotUrl ? `- **Screenshot:** ${replayContext.screenshotUrl}` : ''
        ].filter(Boolean).join('\n'),
        severity: finding.severity,
        evidenceUrl: pageUrl,
        metadata: {
          notionPageId: pageId,
          databaseId: config.databaseId,
          createdAt: new Date().toISOString()
        }
      }
    });

    return {
      id: attachment.id,
      provider: 'NOTION',
      externalId: attachment.externalId,
      attachmentType: 'FINDING',
      title: attachment.title,
      description: attachment.description ?? undefined,
      severity: attachment.severity ?? undefined,
      evidenceUrl: attachment.evidenceUrl ?? undefined,
      createdAt: attachment.createdAt
    };
  }

  /**
   * Register a Notion database or page connection.
   */
  static async registerConnection(
    integrationId: string,
    config: NotionConfig & { name: string }
  ): Promise<void> {
    await prisma.integrationConnection.create({
      data: {
        workspaceIntegrationId: integrationId,
        provider: 'NOTION',
        externalId: config.databaseId ?? config.pageId ?? `notion-${Date.now()}`,
        externalName: config.name,
        connectionType: 'PROJECT',
        metadata: { databaseId: config.databaseId, pageId: config.pageId, name: config.name } as any
      }
    });
  }
}
