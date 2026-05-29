import { prisma } from '@fricta/db';
import { ReplayLinkSummary, EvidenceAttachmentSummary, ReplayContext, LinearConfig } from '../types';

/**
 * LinearConnector — survivability-linked task synchronization.
 *
 * Creates Linear tasks from UX findings with full replay context preserved.
 * Engineering teams see survivability rates, cognitive loads, and friction scores
 * directly in their task management workflow — not just issue text.
 */
export class LinearConnector {
  /**
   * Create a Linear task from a UX finding with full replay evidence embedded.
   */
  static async createTaskFromFinding(
    connectionId: string,
    projectId: string,
    finding: {
      title: string;
      description: string;
      severity: string;
      priority?: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
    },
    replayContext: ReplayContext,
    config: LinearConfig
  ): Promise<{ taskId: string; referenceId: string }> {
    const taskId = `LIN-${Math.floor(Math.random() * 9000) + 1000}`;
    const taskUrl = `https://linear.app/team/${config.teamId}/issue/${taskId}`;

    const ref = await prisma.externalReference.create({
      data: {
        connectionId,
        provider: 'LINEAR',
        refType: 'ISSUE',
        externalId: taskId,
        externalKey: taskId,
        externalUrl: taskUrl,
        title: `[UX] ${finding.title}`,
        status: 'TODO',
        replayLineage: {
          sessionId: replayContext.sessionId,
          sessionGoal: replayContext.sessionGoal,
          severity: finding.severity,
          priority: finding.priority,
          cognitiveLoad: replayContext.cognitiveLoad,
          survivabilityRate: replayContext.survivabilityRate,
          frictionScore: replayContext.frictionScore,
          stepIndex: replayContext.stepIndex
        }
      }
    });

    await prisma.evidenceAttachment.create({
      data: {
        projectId,
        connectionId,
        provider: 'LINEAR',
        externalId: taskId,
        attachmentType: 'FINDING',
        title: finding.title,
        description: [
          finding.description,
          '',
          `**Replay Evidence**`,
          `Session: ${replayContext.sessionId}`,
          `Goal: ${replayContext.sessionGoal ?? 'N/A'}`,
          `Cognitive Load: ${replayContext.cognitiveLoad ?? 'N/A'}%`,
          `Survivability: ${replayContext.survivabilityRate ?? 'N/A'}%`
        ].join('\n'),
        severity: finding.severity,
        evidenceUrl: replayContext.screenshotUrl,
        metadata: { taskId, linearUrl: taskUrl, teamId: config.teamId }
      }
    });

    return { taskId, referenceId: ref.id };
  }

  /**
   * Link a replay session to an existing Linear task for bidirectional context.
   */
  static async linkReplayToTask(
    projectId: string,
    connectionId: string,
    workflowSessionId: string,
    taskId: string,
    taskUrl: string,
    replayContext: ReplayContext
  ): Promise<ReplayLinkSummary> {
    const link = await prisma.replayLink.create({
      data: {
        projectId,
        connectionId,
        workflowSessionId,
        provider: 'LINEAR',
        externalResourceId: taskId,
        externalResourceName: taskId,
        externalResourceUrl: taskUrl,
        linkType: 'ISSUE',
        evidenceSummary: `${replayContext.findingSeverity ?? 'Finding'} — Survivability: ${replayContext.survivabilityRate ?? 'N/A'}% | Cognitive Load: ${replayContext.cognitiveLoad ?? 'N/A'}%`
      }
    });

    return {
      id: link.id,
      provider: 'LINEAR',
      externalResourceId: link.externalResourceId,
      externalResourceName: link.externalResourceName ?? undefined,
      externalResourceUrl: link.externalResourceUrl ?? undefined,
      linkType: 'ISSUE',
      evidenceSummary: link.evidenceSummary ?? undefined,
      createdAt: link.createdAt
    };
  }
}
