import { prisma } from '@fricta/db';
import { ReplayContext, AttachmentType, IntegrationProvider } from '../types';

/**
 * EvidencePackager — builds and retrieves operationally-rich evidence attachments.
 * Centralizes evidence construction so all connectors produce consistent payloads.
 */
export class EvidencePackager {
  static async package(
    projectId: string,
    connectionId: string | null,
    provider: IntegrationProvider,
    externalId: string,
    attachmentType: AttachmentType,
    title: string,
    severity: string,
    replayContext: ReplayContext,
    description?: string
  ): Promise<any> {
    return prisma.evidenceAttachment.create({
      data: {
        projectId,
        connectionId,
        provider,
        externalId,
        attachmentType,
        title,
        description: description ?? this.buildDescription(replayContext),
        severity,
        evidenceUrl: replayContext.screenshotUrl,
        metadata: {
          sessionId: replayContext.sessionId,
          cognitiveLoad: replayContext.cognitiveLoad,
          survivabilityRate: replayContext.survivabilityRate,
          frictionScore: replayContext.frictionScore
        }
      }
    });
  }

  static async listForProject(projectId: string): Promise<any[]> {
    return prisma.evidenceAttachment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });
  }

  private static buildDescription(ctx: ReplayContext): string {
    return [
      `Session: ${ctx.sessionId}`,
      `Goal: ${ctx.sessionGoal ?? 'N/A'}`,
      `Cognitive Load: ${ctx.cognitiveLoad ?? 'N/A'}%`,
      `Survivability: ${ctx.survivabilityRate ?? 'N/A'}%`,
      `Friction: ${ctx.frictionScore ?? 'N/A'}`
    ].join(' | ');
  }
}
