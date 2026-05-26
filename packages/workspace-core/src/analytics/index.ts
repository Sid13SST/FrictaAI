import { PrismaClient } from '@fricta/db';

export class WorkspaceAnalyticsManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Computes aggregated workspace metrics (stability, completion rates, active projects).
   */
  async getWorkspaceAnalytics(workspaceId: string) {
    // 1. Fetch all projects in this workspace
    const projects = await this.prisma.project.findMany({
      where: {
        OR: [
          { workspaceId },
          {
            workspaceProjects: {
              some: { workspaceId },
            },
          },
        ],
      },
      select: { id: true, projectName: true },
    });

    const projectIds = projects.map((p) => p.id);

    if (projectIds.length === 0) {
      return {
        stabilityScore: 100,
        completionRate: 100,
        averageFrictionScore: 0,
        activeProjectsCount: 0,
        totalSessionsRun: 0,
        recentRegressions: [],
        stabilityHistory: [
          { date: new Date().toISOString().split('T')[0], score: 98 },
        ],
      };
    }

    // 2. Fetch recent sessions
    const sessions = await this.prisma.workflowSession.findMany({
      where: {
        projectId: { in: projectIds },
      },
      include: {
        scores: true,
        metrics: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const totalSessions = sessions.length;
    const completedSessions = sessions.filter((s) => s.status === 'COMPLETED').length;
    const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 100;

    let totalScore = 0;
    let scoreCount = 0;
    sessions.forEach((s) => {
      s.scores.forEach((sc) => {
        totalScore += sc.overallScore;
        scoreCount++;
      });
    });

    const stabilityScore = scoreCount > 0 ? (totalScore / scoreCount) * 10 : 85; // Scale to 100-based or use actual average

    // 3. Fetch regressions
    const regressions = await this.prisma.regressionEvent.findMany({
      where: {
        projectId: { in: projectIds },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // 4. Generate historical trend data
    const stabilityHistory = this.generateHistoricalTrends(sessions);

    return {
      stabilityScore: Math.round(stabilityScore),
      completionRate: Math.round(completionRate),
      averageFrictionScore: Math.round(100 - stabilityScore),
      activeProjectsCount: projectIds.length,
      totalSessionsRun: totalSessions,
      recentRegressions: regressions.map((r) => ({
        id: r.id,
        metric: r.metricName,
        drift: r.driftPercentage,
        severity: r.severity,
        createdAt: r.createdAt,
      })),
      stabilityHistory,
    };
  }

  private generateHistoricalTrends(sessions: any[]) {
    const dailyScores: Record<string, { sum: number; count: number }> = {};

    sessions.forEach((s) => {
      const dateStr = s.createdAt.toISOString().split('T')[0];
      let overall = 85; // Default score
      if (s.scores && s.scores.length > 0) {
        overall = s.scores[0].overallScore * 10; // convert 0-10 to percentage
      }

      if (!dailyScores[dateStr]) {
        dailyScores[dateStr] = { sum: 0, count: 0 };
      }
      dailyScores[dateStr].sum += overall;
      dailyScores[dateStr].count += 1;
    });

    // Convert map to sorted list
    const trend = Object.keys(dailyScores)
      .sort()
      .map((date) => ({
        date,
        score: Math.round(dailyScores[date].sum / dailyScores[date].count),
      }));

    if (trend.length === 0) {
      trend.push({
        date: new Date().toISOString().split('T')[0],
        score: 85,
      });
    }

    return trend;
  }
}
