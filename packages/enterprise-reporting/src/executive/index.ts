import { PrismaClient } from '@fricta/db';
import { ExecutiveReportSection } from '../types';

export class ExecutiveReportingCompiler {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Compiles a comprehensive enterprise report for a project.
   */
  async compileReport(projectId: string, title: string, creatorUserId: string, workspaceId: string | null = null): Promise<any> {
    // 1. Fetch project details and latest sessions
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            scores: true,
            visualScores: true,
            uxFindings: true,
            cognitiveSignals: true,
          }
        },
        workflowForecasts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            riskSignals: true,
          }
        },
        historicalPatterns: true,
      }
    });

    if (!project) {
      throw new Error(`Project with ID ${projectId} not found.`);
    }

    // 2. Compute aggregate metrics
    const latestSessions = project.sessions;
    let avgOverallScore = 80;
    let avgCompletionRate = 0.85;
    
    if (latestSessions.length > 0) {
      const scores = latestSessions.map((s: any) => s.scores[0]?.overallScore ?? s.visualScores[0]?.overallScore ?? 80);
      avgOverallScore = Math.round(scores.reduce((a: any, b: any) => a + b, 0) / scores.length);
      
      const successCount = latestSessions.filter((s: any) => s.status === 'COMPLETED' || s.status === 'SUCCESS').length;
      avgCompletionRate = successCount / latestSessions.length;
    }

    // 3. Determine Risk Level
    let riskLevel = 'LOW';
    const latestForecast = project.workflowForecasts[0];
    if (latestForecast) {
      riskLevel = latestForecast.riskLevel;
    } else {
      const hasCriticalFinding = latestSessions.some((s: any) => s.uxFindings.some((f: any) => f.severity === 'CRITICAL'));
      if (hasCriticalFinding) {
        riskLevel = 'CRITICAL';
      } else {
        const hasHighFinding = latestSessions.some((s: any) => s.uxFindings.some((f: any) => f.severity === 'HIGH'));
        if (hasHighFinding) {
          riskLevel = 'HIGH';
        }
      }
    }

    // 4. Synthesize PM-ready executive summary
    let summaryText = `UX Intelligence Audit for ${project.projectName}. `;
    const totalCriticalIssues = latestSessions.reduce((acc: any, s: any) => acc + s.uxFindings.filter((f: any) => f.severity === 'CRITICAL').length, 0);
    const totalHighIssues = latestSessions.reduce((acc: any, s: any) => acc + s.uxFindings.filter((f: any) => f.severity === 'HIGH').length, 0);

    if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
      summaryText += `Critical structural friction was identified during user progression. Immediate prioritization is recommended for onboarding elements and primary conversion paths where exit fatigue is projected to spike.`;
    } else {
      summaryText += `The primary user pathways are operating within acceptable thresholds. General layout clarity and navigation pacing indicate minor cosmetic drift but low abandonment risk.`;
    }

    // 5. Build report sections
    const sections: ExecutiveReportSection[] = [
      {
        id: 'sec-summary',
        title: 'Executive Summary',
        content: summaryText,
        type: 'SUMMARY'
      },
      {
        id: 'sec-risks',
        title: 'Primary UX Bottlenecks & Hazards',
        content: `Audit of latest run metrics resolved ${totalCriticalIssues} critical and ${totalHighIssues} high-severity user experience barriers. Key issues target CTA discovery and cognitive overloading.`,
        type: 'RISK_OVERVIEW',
        metadata: {
          criticalCount: totalCriticalIssues,
          highCount: totalHighIssues,
          historicalPatternsCount: project.historicalPatterns.length
        }
      },
      {
        id: 'sec-stability',
        title: 'Stability & Completion Metrics',
        content: `The workflow displays a composite Stability Score of ${avgOverallScore}/100 with an overall completion rate of ${Math.round(avgCompletionRate * 100)}%.`,
        type: 'STABILITY_METRICS',
        metadata: {
          stabilityScore: avgOverallScore,
          completionRate: avgCompletionRate
        }
      }
    ];

    // If forecast exists, attach predictive insights
    if (latestForecast) {
      sections.push({
        id: 'sec-predictive',
        title: 'Predictive Threat Foresight',
        content: `Fricta's simulation algorithms project a stability index drop down to ${Math.round(latestForecast.stabilityScore * 100)}% if active friction points remain unresolved.`,
        type: 'PREDICTIVE_HIGHLIGHTS',
        metadata: {
          forecastId: latestForecast.id,
          projectedStability: latestForecast.stabilityScore,
          riskSignalsCount: latestForecast.riskSignals.length
        }
      });
    }

    // Save report in DB
    const report = await this.prisma.executiveReport.create({
      data: {
        workspaceId,
        projectId,
        title,
        summary: summaryText,
        stabilityScore: avgOverallScore,
        completionRate: avgCompletionRate,
        riskLevel,
        sections: sections as any,
        createdById: creatorUserId
      }
    });

    return report;
  }
}
