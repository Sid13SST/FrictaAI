import { prisma } from '@fricta/db';
import { ReplayLinkSummary, EvidenceAttachmentSummary, ReplayContext, GitHubConfig } from '../types';

/**
 * GitHubConnector — engineering-linked UX intelligence integration.
 *
 * Links Fricta replay findings to GitHub commits, pull requests, and issues.
 * This prepares Fricta for future CI/CD-aware UX intelligence by establishing
 * the replay-to-code correlation layer now, with deployment extensibility in mind.
 *
 * Architecture Note: This connector is designed for future expansion into:
 * - Deployment-aware replay analysis (replay after each deploy)
 * - Branch-based survivability analysis (compare UX across branches)
 * - Regression-aware PR checks (UX score gates on PRs)
 * - Engineering-linked UX intelligence comments on pull requests
 */
export class GitHubConnector {
  /**
   * Link a UX finding to a GitHub Pull Request.
   * The ExternalReference carries full replay lineage enabling future PR checks.
   */
  static async linkFindingToPR(
    connectionId: string,
    projectId: string,
    prNumber: number,
    prTitle: string,
    prUrl: string,
    finding: {
      title: string;
      description: string;
      severity: string;
    },
    replayContext: ReplayContext,
    config: GitHubConfig
  ): Promise<ReplayLinkSummary> {
    const externalKey = `${config.owner}/${config.repo}#${prNumber}`;

    // Create external reference with full replay lineage (CI/CD-extensible)
    await prisma.externalReference.create({
      data: {
        connectionId,
        provider: 'GITHUB',
        refType: 'PR',
        externalId: String(prNumber),
        externalKey,
        externalUrl: prUrl,
        title: prTitle,
        status: 'OPEN',
        replayLineage: {
          sessionId: replayContext.sessionId,
          sessionGoal: replayContext.sessionGoal,
          findingTitle: finding.title,
          findingSeverity: finding.severity,
          cognitiveLoad: replayContext.cognitiveLoad,
          survivabilityRate: replayContext.survivabilityRate,
          frictionScore: replayContext.frictionScore,
          stepIndex: replayContext.stepIndex,
          // Future: branch name, commit SHA, deploy ID
          _futureExtension: {
            branchName: null,
            commitSha: null,
            deployId: null,
            uxScoreGate: null
          }
        }
      }
    });

    // Attach evidence
    await prisma.evidenceAttachment.create({
      data: {
        projectId,
        connectionId,
        provider: 'GITHUB',
        externalId: String(prNumber),
        attachmentType: 'FINDING',
        title: finding.title,
        description: this.buildPRComment(finding, replayContext, config, prNumber),
        severity: finding.severity,
        evidenceUrl: replayContext.screenshotUrl,
        metadata: { prNumber, repo: `${config.owner}/${config.repo}` }
      }
    });

    // Create replay link
    const link = await prisma.replayLink.create({
      data: {
        projectId,
        connectionId,
        workflowSessionId: replayContext.sessionId,
        provider: 'GITHUB',
        externalResourceId: String(prNumber),
        externalResourceName: externalKey,
        externalResourceUrl: prUrl,
        linkType: 'PR',
        uxFindingId: undefined,
        evidenceSummary: `PR #${prNumber}: ${finding.severity} severity | Cognitive Load: ${replayContext.cognitiveLoad ?? 'N/A'}% | Survivability: ${replayContext.survivabilityRate ?? 'N/A'}%`
      }
    });

    return {
      id: link.id,
      provider: 'GITHUB',
      externalResourceId: link.externalResourceId,
      externalResourceName: link.externalResourceName ?? undefined,
      externalResourceUrl: link.externalResourceUrl ?? undefined,
      linkType: 'PR',
      evidenceSummary: link.evidenceSummary ?? undefined,
      createdAt: link.createdAt
    };
  }

  /**
   * Link a UX finding to a GitHub Issue.
   */
  static async linkFindingToIssue(
    connectionId: string,
    projectId: string,
    issueNumber: number,
    issueTitle: string,
    issueUrl: string,
    replayContext: ReplayContext,
    config: GitHubConfig
  ): Promise<ReplayLinkSummary> {
    const externalKey = `${config.owner}/${config.repo}#${issueNumber}`;

    await prisma.externalReference.create({
      data: {
        connectionId,
        provider: 'GITHUB',
        refType: 'ISSUE',
        externalId: String(issueNumber),
        externalKey,
        externalUrl: issueUrl,
        title: issueTitle,
        status: 'OPEN',
        replayLineage: {
          sessionId: replayContext.sessionId,
          cognitiveLoad: replayContext.cognitiveLoad,
          survivabilityRate: replayContext.survivabilityRate
        }
      }
    });

    const link = await prisma.replayLink.create({
      data: {
        projectId,
        connectionId,
        workflowSessionId: replayContext.sessionId,
        provider: 'GITHUB',
        externalResourceId: String(issueNumber),
        externalResourceName: externalKey,
        externalResourceUrl: issueUrl,
        linkType: 'ISSUE',
        evidenceSummary: `Issue #${issueNumber} — ${replayContext.findingSeverity ?? 'Finding'}`
      }
    });

    return {
      id: link.id,
      provider: 'GITHUB',
      externalResourceId: link.externalResourceId,
      externalResourceName: link.externalResourceName ?? undefined,
      externalResourceUrl: link.externalResourceUrl ?? undefined,
      linkType: 'ISSUE',
      evidenceSummary: link.evidenceSummary ?? undefined,
      createdAt: link.createdAt
    };
  }

  /**
   * Register a GitHub repository connection.
   */
  static async registerConnection(
    integrationId: string,
    config: GitHubConfig & { repoUrl: string }
  ): Promise<void> {
    await prisma.integrationConnection.create({
      data: {
        workspaceIntegrationId: integrationId,
        provider: 'GITHUB',
        externalId: `${config.owner}/${config.repo}`,
        externalName: `${config.owner}/${config.repo}`,
        externalUrl: config.repoUrl,
        connectionType: 'REPO',
        metadata: { owner: config.owner, repo: config.repo }
      }
    });
  }

  private static buildPRComment(
    finding: { title: string; description: string; severity: string },
    ctx: ReplayContext,
    config: GitHubConfig,
    prNumber: number
  ): string {
    return [
      `## 🔍 Fricta UX Intelligence Report`,
      ``,
      `**Finding:** ${finding.title}`,
      `**Severity:** \`${finding.severity}\``,
      `**Repository:** ${config.owner}/${config.repo} PR #${prNumber}`,
      ``,
      `### Description`,
      finding.description,
      ``,
      `### Replay Evidence`,
      `| Metric | Value |`,
      `|---|---|`,
      `| Session ID | \`${ctx.sessionId}\` |`,
      `| Goal | ${ctx.sessionGoal ?? 'N/A'} |`,
      `| Cognitive Load | ${ctx.cognitiveLoad ?? 'N/A'}% |`,
      `| Survivability Rate | ${ctx.survivabilityRate ?? 'N/A'}% |`,
      `| Friction Score | ${ctx.frictionScore ?? 'N/A'} |`,
      ``,
      `> This comment was generated by [Fricta](https://fricta.ai) operational UX intelligence.`
    ].join('\n');
  }
}
