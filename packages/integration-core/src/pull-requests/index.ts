import { prisma } from '@fricta/db';

export class PullRequestIntelligenceManager {
  /**
   * Create or update PR intelligence context linked to a deployment run.
   */
  static async syncPullRequestIntelligence(
    deploymentRunId: string,
    prDetails: {
      prNumber: string;
      prTitle: string;
      sourceBranch: string;
      targetBranch: string;
    }
  ): Promise<any> {
    // Look up regressions and risks on the deployment run
    const regressions = await prisma.regressionAnalysis.findMany({
      where: { deploymentRunId }
    });

    const risks = await prisma.deploymentRiskSignal.findMany({
      where: { deploymentRunId }
    });

    // Calculate score deltas
    const run = await prisma.deploymentRun.findUnique({
      where: { id: deploymentRunId }
    });

    const survivabilityDelta = run?.survivabilityScore 
      ? run.survivabilityScore - 85.0 // vs baseline 85.0
      : 0.0;

    const cognitiveDrift = regressions.find(r => r.metricName === 'COGNITIVE_LOAD')?.delta ?? 0.0;
    
    // Risk score out of 100 based on regressions/risks
    const riskScore = Math.min(100, (regressions.length * 20) + (risks.length * 15));

    const summary = this.compileMarkdownSummary(
      prDetails.prTitle,
      prDetails.prNumber,
      run?.survivabilityScore ?? null,
      survivabilityDelta,
      cognitiveDrift,
      regressions,
      risks,
      riskScore
    );

    const intel = await prisma.pullRequestIntelligence.create({
      data: {
        deploymentRunId,
        prNumber: prDetails.prNumber,
        prTitle: prDetails.prTitle,
        sourceBranch: prDetails.sourceBranch,
        targetBranch: prDetails.targetBranch,
        uxRegressionCount: regressions.length,
        cognitiveDrift,
        survivabilityDelta,
        riskScore,
        summary,
        status: 'COMPLETED'
      }
    });

    await prisma.releaseTimelineEvent.create({
      data: {
        deploymentRunId,
        eventType: 'PR_COMMENTED',
        eventTitle: 'PR Intelligence Posted',
        description: `UX Survivability Analysis posted to PR #${prDetails.prNumber}`
      }
    });

    return intel;
  }

  private static compileMarkdownSummary(
    title: string,
    prNumber: string,
    survivability: number | null,
    delta: number,
    drift: number,
    regressions: any[],
    risks: any[],
    riskScore: number
  ): string {
    const statusIcon = riskScore > 50 ? '⚠️' : '✅';
    const deltaSign = delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`;
    const driftSign = drift >= 0 ? `+${drift.toFixed(1)}%` : `${drift.toFixed(1)}%`;

    let md = `## ${statusIcon} Fricta UX Survivability Report — PR #${prNumber}\n\n`;
    md += `### PR: **${title}**\n\n`;
    md += `| Metric | Current Value | Delta | Status |\n`;
    md += `|---|---|---|---|\n`;
    md += `| **UX Survivability** | ${survivability ?? 'N/A'}% | ${deltaSign} | ${delta < -10 ? '🔴 Warning' : '🟢 Stable'} |\n`;
    md += `| **Cognitive Drift** | ${drift !== 0 ? driftSign : '0.0%'} | ${drift > 10 ? '🔴 Spike' : '🟢 Low'} | - |\n`;
    md += `| **Overall Risk Score** | ${riskScore}/100 | - | ${riskScore > 60 ? '🔴 High Risk' : riskScore > 30 ? '🟡 Medium Risk' : '🟢 Low Risk'} |\n\n`;

    if (regressions.length > 0) {
      md += `### 🔍 Flagged UX Regressions\n`;
      regressions.forEach(r => {
        md += `- **${r.workflowPath}** (${r.metricName}): ${r.explanation} [Severity: **${r.severity}**]\n`;
      });
      md += `\n`;
    }

    if (risks.length > 0) {
      md += `### 🚨 Target Elements & Friction Risks\n`;
      risks.forEach(rk => {
        md += `- **${rk.riskType}**: ${rk.description} [Severity: **${rk.severity}**]\n`;
      });
      md += `\n`;
    }

    md += `---  \n`;
    md += `*Generated automatically by Fricta deployment-aware intelligence.*`;
    return md;
  }
}
