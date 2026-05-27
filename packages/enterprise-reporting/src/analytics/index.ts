import { PrismaClient, WorkspaceInsightDigest } from '@prisma/client';

export class WorkspaceAnalyticsEngine {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Generates a workspace intelligence digest.
   */
  async generateDigest(workspaceId: string, title: string, period: 'DAILY' | 'WEEKLY' | 'MONTHLY'): Promise<WorkspaceInsightDigest> {
    const projects = await this.prisma.project.findMany({
      where: { workspaceId },
      include: {
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: {
            scores: true,
            visualScores: true
          }
        },
        workflowForecasts: {
          orderBy: { createdAt: 'desc' },
          take: 2,
          include: {
            riskSignals: true
          }
        }
      }
    });

    // Aggregate statistics
    let totalRuns = 0;
    let totalScoreSum = 0;
    let scoresCount = 0;
    const topRisksList: any[] = [];

    projects.forEach(project => {
      totalRuns += project.sessions.length;
      project.sessions.forEach(session => {
        const score = session.scores[0]?.overallScore ?? session.visualScores[0]?.overallScore;
        if (score !== undefined) {
          totalScoreSum += score;
          scoresCount++;
        }
      });

      project.workflowForecasts.forEach(forecast => {
        forecast.riskSignals.forEach(signal => {
          if (signal.severity === 'CRITICAL' || signal.severity === 'HIGH') {
            topRisksList.push({
              project: project.projectName,
              type: signal.riskType,
              severity: signal.severity,
              notes: signal.evidenceNotes
            });
          }
        });
      });
    });

    const averageStability = scoresCount > 0 ? Math.round(totalScoreSum / scoresCount) : 80;

    const metricsSummary = {
      averageStability,
      totalRunsThisPeriod: totalRuns,
      projectsAuditedCount: projects.length
    };

    const digest = await this.prisma.workspaceInsightDigest.create({
      data: {
        workspaceId,
        title,
        digestPeriod: period,
        metricsSummary,
        topRisks: topRisksList.slice(0, 5),
        deliveredAt: new Date()
      }
    });

    return digest;
  }

  /**
   * Retreives longitudinal stability curve points for all projects inside workspace.
   */
  async getCrossProjectStabilityTimeline(workspaceId: string): Promise<any[]> {
    const projects = await this.prisma.project.findMany({
      where: { workspaceId },
      include: {
        sessions: {
          orderBy: { createdAt: 'asc' },
          include: {
            scores: true,
            visualScores: true
          }
        }
      }
    });

    return projects.map(proj => {
      const dataPoints = proj.sessions.map(s => {
        const score = s.scores[0]?.overallScore ?? s.visualScores[0]?.overallScore ?? 80;
        return {
          date: s.createdAt.toISOString().split('T')[0],
          score
        };
      });

      return {
        projectId: proj.id,
        projectName: proj.projectName,
        dataPoints
      };
    });
  }
}
