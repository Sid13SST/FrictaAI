import { prisma } from '@fricta/db';
import { EvidenceAttachmentSummary, ReplayContext, ProductboardConfig } from '../types';

/**
 * ProductboardConnector — feature evidence routing with UX intelligence.
 *
 * Routes UX findings, cognitive signals, and survivability data to Productboard
 * features, ensuring product decisions are backed by operational UX evidence
 * rather than anecdotal feedback. Every evidence note preserves replay lineage.
 */
export class ProductboardConnector {
  /**
   * Route UX evidence to a Productboard feature note.
   * Embeds cognitive load, survivability, and replay reference into the feature context.
   */
  static async routeEvidenceToFeature(
    connectionId: string,
    projectId: string,
    featureId: string,
    featureName: string,
    finding: {
      title: string;
      description: string;
      severity: string;
    },
    replayContext: ReplayContext
  ): Promise<EvidenceAttachmentSummary> {
    const attachment = await prisma.evidenceAttachment.create({
      data: {
        projectId,
        connectionId,
        provider: 'PRODUCTBOARD',
        externalId: featureId,
        attachmentType: 'FINDING',
        title: `[UX Evidence] ${finding.title}`,
        description: [
          `Feature: ${featureName}`,
          ``,
          finding.description,
          ``,
          `**Operational UX Evidence**`,
          `Session: ${replayContext.sessionId}`,
          `Goal: ${replayContext.sessionGoal ?? 'N/A'}`,
          `Cognitive Load: ${replayContext.cognitiveLoad ?? 'N/A'}%`,
          `Survivability: ${replayContext.survivabilityRate ?? 'N/A'}%`,
          `Friction Score: ${replayContext.frictionScore ?? 'N/A'}`
        ].join('\n'),
        severity: finding.severity,
        evidenceUrl: replayContext.screenshotUrl,
        metadata: {
          featureId,
          featureName,
          routedAt: new Date().toISOString(),
          replaySession: replayContext.sessionId
        }
      }
    });

    // Also register an ExternalReference for bidirectional lookup
    await prisma.externalReference.create({
      data: {
        connectionId,
        provider: 'PRODUCTBOARD',
        refType: 'FEATURE',
        externalId: featureId,
        externalKey: `PB-FEATURE-${featureId}`,
        title: featureName,
        status: 'EVIDENCE_ATTACHED',
        replayLineage: {
          sessionId: replayContext.sessionId,
          cognitiveLoad: replayContext.cognitiveLoad,
          survivabilityRate: replayContext.survivabilityRate
        }
      }
    });

    return {
      id: attachment.id,
      provider: 'PRODUCTBOARD',
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
   * Register a Productboard workspace connection.
   */
  static async registerConnection(
    integrationId: string,
    workspaceId: string,
    workspaceName: string
  ): Promise<void> {
    await prisma.integrationConnection.create({
      data: {
        workspaceIntegrationId: integrationId,
        provider: 'PRODUCTBOARD',
        externalId: workspaceId,
        externalName: workspaceName,
        connectionType: 'PROJECT'
      }
    });
  }
}
