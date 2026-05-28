import { prisma } from '@fricta/db';

export class WorkspacePortfolioManager {
  /**
   * Compiles workspace-wide cross-project health index dashboards.
   */
  static async evaluatePortfolioHealth(workspaceId: string | null) {
    const projects = await prisma.project.findMany({
      where: workspaceId ? { workspaceId } : { workspaceId: null },
      include: {
        sessions: {
          include: { scores: true }
        }
      }
    });

    if (projects.length === 0) {
      return { stabilityScore: 100, projectStats: [] };
    }

    const projectStats = [];
    let totalScore = 0;
    let countedProjects = 0;

    for (const p of projects) {
      const sessions = p.sessions.filter(s => s.status === 'COMPLETED');
      if (sessions.length === 0) continue;

      const sum = sessions.reduce((acc, s) => acc + (s.scores[0]?.clarityScore || 80), 0);
      const avg = sum / sessions.length;

      projectStats.push({
        projectId: p.id,
        projectName: p.projectName,
        stabilityScore: avg,
        sessionCount: sessions.length
      });

      totalScore += avg;
      countedProjects++;
    }

    return {
      stabilityScore: countedProjects > 0 ? totalScore / countedProjects : 80,
      projectStats
    };
  }
}
