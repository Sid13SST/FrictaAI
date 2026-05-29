import { prisma } from '@fricta/db';
import { ReplayLinkSummary, EvidenceAttachmentSummary, ReplayContext } from '../types';

/**
 * FigJamConnector — collaborative investigation board integration.
 *
 * Extends Figma's whiteboard canvas (FigJam) with operational UX intelligence.
 * Teams can create investigation boards referencing replay evidence, cognitive
 * signals, and survivability findings — all with full lineage preserved.
 */
export class FigJamConnector {
  /**
   * Link a replay session to a FigJam board node (sticky, section, or shape).
   * Preserves operational evidence so teams can trace decisions back to replays.
   */
  static async linkReplayToBoard(
    projectId: string,
    connectionId: string | null,
    workflowSessionId: string,
    boardNodeId: string,
    boardName: string,
    boardUrl: string,
    replayContext: ReplayContext
  ): Promise<ReplayLinkSummary> {
    const parts: string[] = [];
    if (replayContext.findingTitle) parts.push(`Finding: ${replayContext.findingTitle}`);
    if (replayContext.cognitiveLoad) parts.push(`Cognitive Load: ${replayContext.cognitiveLoad}%`);
    if (replayContext.survivabilityRate) parts.push(`Survivability: ${replayContext.survivabilityRate}%`);

    const link = await prisma.replayLink.create({
      data: {
        projectId,
        connectionId,
        workflowSessionId,
        provider: 'FIGJAM',
        externalResourceId: boardNodeId,
        externalResourceName: boardName,
        externalResourceUrl: boardUrl,
        linkType: 'BOARD',
        evidenceSummary: parts.join(' | ') || 'FigJam board investigation linked'
      }
    });

    return {
      id: link.id,
      provider: 'FIGJAM',
      externalResourceId: link.externalResourceId,
      externalResourceName: link.externalResourceName ?? undefined,
      externalResourceUrl: link.externalResourceUrl ?? undefined,
      linkType: 'BOARD',
      evidenceSummary: link.evidenceSummary ?? undefined,
      createdAt: link.createdAt
    };
  }

  /**
   * Attach UX investigation evidence to a FigJam board.
   * Includes cognitive friction, survivability, and replay screenshot references
   * so collaborative investigation sessions remain operationally grounded.
   */
  static async attachInvestigationEvidence(
    projectId: string,
    connectionId: string | null,
    boardNodeId: string,
    evidence: {
      title: string;
      description: string;
      severity: string;
      screenshotPath?: string;
    }
  ): Promise<EvidenceAttachmentSummary> {
    const attachment = await prisma.evidenceAttachment.create({
      data: {
        projectId,
        connectionId,
        provider: 'FIGJAM',
        externalId: boardNodeId,
        attachmentType: 'FINDING',
        title: evidence.title,
        description: evidence.description,
        evidenceUrl: evidence.screenshotPath,
        severity: evidence.severity
      }
    });

    return {
      id: attachment.id,
      provider: 'FIGJAM',
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
   * Register a FigJam board connection for a workspace integration.
   */
  static async registerConnection(
    integrationId: string,
    boardId: string,
    boardName: string,
    boardUrl: string
  ): Promise<void> {
    await prisma.integrationConnection.create({
      data: {
        workspaceIntegrationId: integrationId,
        provider: 'FIGJAM',
        externalId: boardId,
        externalName: boardName,
        externalUrl: boardUrl,
        connectionType: 'BOARD'
      }
    });
  }
}
