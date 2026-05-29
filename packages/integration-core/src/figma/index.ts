import { prisma } from '@fricta/db';
import {
  ReplayLinkSummary,
  EvidenceAttachmentSummary,
  ReplayContext,
  FigmaConfig
} from '../types';

/**
 * FigmaConnector — replay-aware design intelligence integration.
 *
 * Connects Fricta's operational UX intelligence (replays, cognitive findings,
 * survivability data) directly to Figma design frames, preserving full lineage.
 * Designers can inspect UX findings, trace survivability issues, and access
 * cognitive analysis directly from design contexts.
 */
export class FigmaConnector {
  /**
   * Link a Fricta replay session to a specific Figma frame node.
   * Embeds a serialized replay context so designers see evidence in-tool.
   */
  static async linkReplayToFrame(
    projectId: string,
    connectionId: string | null,
    workflowSessionId: string,
    frameNodeId: string,
    frameName: string,
    frameUrl: string,
    replayContext: ReplayContext
  ): Promise<ReplayLinkSummary> {
    const link = await prisma.replayLink.create({
      data: {
        projectId,
        connectionId,
        workflowSessionId,
        provider: 'FIGMA',
        externalResourceId: frameNodeId,
        externalResourceName: frameName,
        externalResourceUrl: frameUrl,
        linkType: 'FRAME',
        evidenceSummary: this.buildEvidenceSummary(replayContext)
      }
    });

    return {
      id: link.id,
      provider: 'FIGMA',
      externalResourceId: link.externalResourceId,
      externalResourceName: link.externalResourceName ?? undefined,
      externalResourceUrl: link.externalResourceUrl ?? undefined,
      linkType: 'FRAME',
      evidenceSummary: link.evidenceSummary ?? undefined,
      createdAt: link.createdAt
    };
  }

  /**
   * Attach a UX finding to a Figma frame as an evidence annotation.
   * Includes cognitive load, severity, and replay reference so designers
   * can open replay-linked evidence directly from the design context.
   */
  static async attachFindingToFrame(
    projectId: string,
    connectionId: string | null,
    frameNodeId: string,
    finding: {
      title: string;
      description: string;
      severity: string;
      screenshotPath?: string;
      cognitiveLoad?: number;
      survivabilityRate?: number;
    }
  ): Promise<EvidenceAttachmentSummary> {
    const attachment = await prisma.evidenceAttachment.create({
      data: {
        projectId,
        connectionId,
        provider: 'FIGMA',
        externalId: frameNodeId,
        attachmentType: 'FINDING',
        title: finding.title,
        description: `${finding.description}\n\nCognitive Load: ${finding.cognitiveLoad ?? 'N/A'}% | Survivability: ${finding.survivabilityRate ?? 'N/A'}%`,
        evidenceUrl: finding.screenshotPath,
        severity: finding.severity,
        metadata: {
          cognitiveLoad: finding.cognitiveLoad,
          survivabilityRate: finding.survivabilityRate,
          attachedAt: new Date().toISOString()
        }
      }
    });

    return {
      id: attachment.id,
      provider: 'FIGMA',
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
   * Register an external Figma file/project connection for a workspace integration.
   */
  static async registerConnection(
    integrationId: string,
    config: FigmaConfig & { fileName: string; fileUrl: string }
  ): Promise<void> {
    await prisma.integrationConnection.create({
      data: {
        workspaceIntegrationId: integrationId,
        provider: 'FIGMA',
        externalId: config.fileId ?? `figma-file-${Date.now()}`,
        externalName: config.fileName,
        externalUrl: config.fileUrl,
        connectionType: 'FILE',
        metadata: { fileId: config.fileId, fileName: config.fileName, fileUrl: config.fileUrl } as any
      }
    });
  }

  /**
   * Retrieve all replay links for a given Figma frame node.
   */
  static async getFrameReplayLinks(
    projectId: string,
    frameNodeId: string
  ): Promise<ReplayLinkSummary[]> {
    const links = await prisma.replayLink.findMany({
      where: { projectId, provider: 'FIGMA', externalResourceId: frameNodeId },
      orderBy: { createdAt: 'desc' }
    });

    return links.map(l => ({
      id: l.id,
      provider: 'FIGMA',
      externalResourceId: l.externalResourceId,
      externalResourceName: l.externalResourceName ?? undefined,
      externalResourceUrl: l.externalResourceUrl ?? undefined,
      linkType: l.linkType as any,
      uxFindingId: l.uxFindingId ?? undefined,
      evidenceSummary: l.evidenceSummary ?? undefined,
      createdAt: l.createdAt
    }));
  }

  private static buildEvidenceSummary(ctx: ReplayContext): string {
    const parts = [];
    if (ctx.findingTitle) parts.push(`Finding: ${ctx.findingTitle}`);
    if (ctx.findingSeverity) parts.push(`Severity: ${ctx.findingSeverity}`);
    if (ctx.cognitiveLoad) parts.push(`Cognitive Load: ${ctx.cognitiveLoad}%`);
    if (ctx.survivabilityRate) parts.push(`Survivability: ${ctx.survivabilityRate}%`);
    if (ctx.sessionGoal) parts.push(`Session Goal: ${ctx.sessionGoal}`);
    return parts.join(' | ') || 'Replay evidence attached';
  }
}
