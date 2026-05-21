import { UnifiedUXReportPayload, ExecutiveSummaryPayload } from './types';

export class ExportEngine {
  /**
   * Formats the UX Report into a structured, executive-ready Markdown document.
   */
  static toMarkdown(report: UnifiedUXReportPayload, executive: ExecutiveSummaryPayload): string {
    const session = report.session;
    const scores = report.scores;

    let md = `# Fricta AI UX Intelligence Report\n\n`;
    md += `## Workflow Session: \`${session.id}\`\n`;
    md += `- **Goal**: ${session.goal || 'Not specified'}\n`;
    md += `- **Target Persona**: ${session.persona || 'Standard'}\n`;
    md += `- **Total Steps**: ${session.stepCount}\n`;
    md += `- **Session Duration**: ${
      session.startedAt && session.endedAt 
        ? `${((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000).toFixed(1)}s` 
        : 'Unknown'
    }\n\n`;

    md += `## Executive Usability Assessment\n`;
    md += `| Metric | Value | Rating / Risk |\n`;
    md += `| :--- | :--- | :--- |\n`;
    md += `| **Overall UX Score** | **${executive.overallScore}/100** | **Grade: ${executive.overallUXGrade}** |\n`;
    md += `| **Onboarding Friction** | ${scores.onboardingScore}/100 | **${executive.onboardingFrictionLevel}** |\n`;
    md += `| **Information Architecture (IA)** | ${scores.iaScore}/100 | - |\n`;
    md += `| **Visual Clarity** | ${scores.clarityScore}/100 | **Discoverability Risk: ${executive.discoverabilityRiskLevel}** |\n`;
    md += `| **Interaction Efficiency** | ${scores.efficiencyScore}/100 | - |\n\n`;

    md += `### Core Executive Insights\n`;
    executive.synthesizedInsights.forEach((insight, idx) => {
      md += `${idx + 1}. **${insight}**\n`;
    });
    md += `\n`;

    if (executive.majorFrictionStepIndices.length > 0) {
      md += `> [!WARNING]\n`;
      md += `> **Friction Accumulation Zones**: Usability breakdown and cognitive hesitation spikes were detected at steps: **${executive.majorFrictionStepIndices.join(', ')}**.\n\n`;
    }

    md += `## Human-Centric UX Findings\n`;
    if (report.uxFindings.length === 0) {
      md += `*No major behavioral UX issues detected.*\n\n`;
    } else {
      const sortedFindings = [...report.uxFindings].sort((a, b) => {
        const priority: Record<string, number> = { 'CRITICAL': 1, 'HIGH': 2, 'MEDIUM': 3, 'LOW': 4 };
        return (priority[a.severity] || 5) - (priority[b.severity] || 5);
      });

      sortedFindings.forEach((finding, idx) => {
        md += `### ${idx + 1}. [${finding.severity}] ${finding.title}\n`;
        md += `- **Persona Impact**: \`${finding.personaType}\`\n`;
        md += `- **Finding Type**: \`${finding.findingType}\`\n`;
        md += `- **Description**: ${finding.description}\n`;
        md += `- **Evidence**: *${finding.evidence}*\n`;
        md += `- **Actionable Recommendation**: **${finding.recommendation}**\n\n`;
      });
    }

    md += `## Visual & Discoverability Findings\n`;
    if (report.visualFindings.length === 0) {
      md += `*No major visual anomalies detected.*\n\n`;
    } else {
      report.visualFindings.forEach((vf, idx) => {
        md += `### VF-${idx + 1}. [${vf.severity.toUpperCase()}] ${vf.title}\n`;
        md += `- **Type**: \`${vf.findingType}\`\n`;
        md += `- **Observation**: ${vf.description}\n`;
        if (vf.boundingBoxes && Array.isArray(vf.boundingBoxes) && vf.boundingBoxes.length > 0) {
          md += `- **Impacted Regions**:\n`;
          vf.boundingBoxes.forEach((box: any) => {
            md += `  - \`${box.label}\` at coordinate bounding box \`[x:${box.x}, y:${box.y}, w:${box.w}, h:${box.h}]\`\n`;
          });
        }
        md += `\n`;
      });
    }

    md += `## Simulated Persona Performance Projections\n`;
    if (report.personaProfiles.length === 0) {
      md += `*No persona profiles simulated.*\n`;
    } else {
      md += `| Persona Name | Guidance Dependency | Patience | Comfort with IA | Idle Hesitation Limit | Action Cycles Limit | Max Steps Limit |\n`;
      md += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;
      report.personaProfiles.forEach(p => {
        md += `| **${p.name}** | ${p.traits.guidanceDependency} | ${p.traits.patience} | ${p.traits.comfortWithIA} | ${p.behaviorModifiers.idleHesitationThresholdMs}ms | ${p.behaviorModifiers.maxActionCyclesAllowed} | ${p.behaviorModifiers.excessiveStepsThreshold} |\n`;
      });
      md += `\n`;
    }

    return md;
  }

  /**
   * Generates a plain text spreadsheet/sheet format for quick copy-pasting.
   */
  static toTextSheet(report: UnifiedUXReportPayload, executive: ExecutiveSummaryPayload): string {
    let text = `==================================================\n`;
    text += `FRICTA UX REPORT SUMMARY SHEET\n`;
    text += `==================================================\n`;
    text += `Session ID: ${report.session.id}\n`;
    text += `Overall Score: ${executive.overallScore}/100 (Grade: ${executive.overallUXGrade})\n`;
    text += `Onboarding Friction: ${executive.onboardingFrictionLevel}\n`;
    text += `Discoverability Risk: ${executive.discoverabilityRiskLevel}\n`;
    text += `Steps with Spikes: ${executive.majorFrictionStepIndices.join(', ') || 'None'}\n`;
    text += `--------------------------------------------------\n`;
    text += `PM INSIGHTS:\n`;
    executive.synthesizedInsights.forEach((ins, idx) => {
      text += `[${idx + 1}] ${ins}\n`;
    });
    text += `--------------------------------------------------\n`;
    text += `TOP RECOMMENDATIONS:\n`;
    const highFindings = report.uxFindings.filter(f => f.severity === 'HIGH' || f.severity === 'CRITICAL');
    if (highFindings.length === 0) {
      text += `- Maintain existing workflow routes.\n`;
    } else {
      highFindings.forEach(f => {
        text += `- [${f.severity}] ${f.title}: ${f.recommendation}\n`;
      });
    }
    text += `==================================================\n`;
    return text;
  }

  /**
   * Returns a clean, developer-friendly developer debug JSON dump.
   */
  static toDeveloperJson(report: UnifiedUXReportPayload, executive: ExecutiveSummaryPayload): string {
    return JSON.stringify({
      meta: {
        engine: "Fricta Unified Report Engine v1.0",
        timestamp: new Date().toISOString()
      },
      assessment: executive,
      data: report
    }, null, 2);
  }
}
