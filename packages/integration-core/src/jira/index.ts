import { prisma } from '@fricta/db';
import { ReplayLinkSummary, EvidenceAttachmentSummary, ReplayContext, JiraConfig } from '../types';

/**
 * JiraConnector — replay-aware ticket creation and UX finding synchronization.
 *
 * Creates Jira issues that carry full operational UX context: replay session IDs,
 * cognitive load metrics, survivability data, and evidence screenshot references.
 * Every ticket preserves replay lineage so engineers understand the full UX failure context.
 */
export class JiraConnector {
  /**
   * Create a Jira issue from a UX finding, embedding replay-backed evidence context.
   * Returns an ExternalReference record preserving the full replay lineage.
   */
  static async createTicketFromFinding(
    connectionId: string,
    projectId: string,
    finding: {
      title: string;
      description: string;
      severity: string;
      stepUrl?: string;
    },
    replayContext: ReplayContext,
    jiraConfig: JiraConfig
  ): Promise<{ externalKey: string; referenceId: string }> {
    // Build the Jira issue key (simulated — real impl would call Jira REST API)
    const issueNumber = Math.floor(Math.random() * 9000) + 1000;
    const issueKey = `${jiraConfig.projectKey}-${issueNumber}`;
    const issueUrl = `${jiraConfig.baseUrl}/browse/${issueKey}`;

    // Create the ExternalReference with full replay lineage
    const ref = await prisma.externalReference.create({
      data: {
        connectionId,
        provider: 'JIRA',
        refType: 'ISSUE',
        externalId: issueKey,
        externalKey: issueKey,
        externalUrl: issueUrl,
        title: `[UX] ${finding.title}`,
        status: 'OPEN',
        replayLineage: {
          sessionId: replayContext.sessionId,
          sessionGoal: replayContext.sessionGoal,
          findingSeverity: finding.severity,
          cognitiveLoad: replayContext.cognitiveLoad,
          survivabilityRate: replayContext.survivabilityRate,
          stepIndex: replayContext.stepIndex,
          screenshotUrl: replayContext.screenshotUrl,
          frictionScore: replayContext.frictionScore
        }
      }
    });

    // Attach the evidence payload
    await prisma.evidenceAttachment.create({
      data: {
        projectId,
        connectionId,
        provider: 'JIRA',
        externalId: issueKey,
        attachmentType: 'FINDING',
        title: finding.title,
        description: this.buildJiraDescription(finding, replayContext),
        severity: finding.severity,
        evidenceUrl: replayContext.screenshotUrl,
        metadata: { issueKey, jiraUrl: issueUrl }
      }
    });

    return { externalKey: issueKey, referenceId: ref.id };
  }

  /**
   * Link an existing Jira issue to a replay session for bidirectional traceability.
   */
  static async linkReplayToIssue(
    projectId: string,
    connectionId: string,
    workflowSessionId: string,
    issueKey: string,
    issueUrl: string,
    replayContext: ReplayContext
  ): Promise<ReplayLinkSummary> {
    const link = await prisma.replayLink.create({
      data: {
        projectId,
        connectionId,
        workflowSessionId,
        provider: 'JIRA',
        externalResourceId: issueKey,
        externalResourceName: issueKey,
        externalResourceUrl: issueUrl,
        linkType: 'ISSUE',
        evidenceSummary: `Severity: ${replayContext.findingSeverity ?? 'N/A'} | Cognitive Load: ${replayContext.cognitiveLoad ?? 'N/A'}% | Survivability: ${replayContext.survivabilityRate ?? 'N/A'}%`
      }
    });

    return {
      id: link.id,
      provider: 'JIRA',
      externalResourceId: link.externalResourceId,
      externalResourceName: link.externalResourceName ?? undefined,
      externalResourceUrl: link.externalResourceUrl ?? undefined,
      linkType: 'ISSUE',
      evidenceSummary: link.evidenceSummary ?? undefined,
      createdAt: link.createdAt
    };
  }

  private static buildJiraDescription(
    finding: { title: string; description: string; severity: string },
    ctx: ReplayContext
  ): string {
    return [
      `*UX Finding:* ${finding.title}`,
      `*Severity:* ${finding.severity}`,
      ``,
      `*Description:*`,
      finding.description,
      ``,
      `*Replay Evidence:*`,
      `- Session ID: ${ctx.sessionId}`,
      `- Session Goal: ${ctx.sessionGoal ?? 'N/A'}`,
      `- Cognitive Load: ${ctx.cognitiveLoad ?? 'N/A'}%`,
      `- Survivability Rate: ${ctx.survivabilityRate ?? 'N/A'}%`,
      `- Friction Score: ${ctx.frictionScore ?? 'N/A'}`,
      ctx.screenshotUrl ? `- Screenshot: ${ctx.screenshotUrl}` : ''
    ].filter(Boolean).join('\n');
  }
}
