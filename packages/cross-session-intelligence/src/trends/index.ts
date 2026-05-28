import { prisma } from '@fricta/db';
import { LongitudinalTrendData } from '../types';

export class LongitudinalTrendAnalyzer {
  /**
   * Compiles and saves a longitudinal organizational trend record.
   */
  static async computeWorkspaceTrends(workspaceId: string | null) {
    // 1. Gather all projects in workspace
    const projects = await prisma.project.findMany({
      where: workspaceId ? { workspaceId } : { workspaceId: null },
      include: {
        sessions: {
          include: { scores: true, cognitiveSignals: true }
        }
      }
    });

    if (projects.length === 0) {
      return [];
    }

    const allSessions = projects.flatMap(p => p.sessions).filter(s => s.status === 'COMPLETED');
    if (allSessions.length === 0) {
      return [];
    }

    // 2. Compute aggregate stability
    const totalStability = allSessions.reduce((acc, s) => {
      const score = s.scores[0]?.clarityScore || 80;
      return acc + score;
    }, 0);
    const avgStability = totalStability / allSessions.length;

    // 3. Compute aggregate complexity ratio (cognitive overload / choice complexity counts)
    const totalSignals = allSessions.reduce((acc, s) => acc + s.cognitiveSignals.length, 0);
    const avgComplexity = totalSignals / allSessions.length;

    // 4. Create and save trend records
    const stabilityTrend = await prisma.organizationalTrend.create({
      data: {
        workspaceId,
        trendType: 'stability',
        interval: 'WEEKLY',
        timestamp: new Date(),
        scoreValue: avgStability,
        metadata: {
          sessionCount: allSessions.length,
          projectCount: projects.length
        }
      }
    });

    const complexityTrend = await prisma.organizationalTrend.create({
      data: {
        workspaceId,
        trendType: 'complexity',
        interval: 'WEEKLY',
        timestamp: new Date(),
        scoreValue: avgComplexity,
        metadata: {
          averageSignalsPerSession: avgComplexity
        }
      }
    });

    return [stabilityTrend, complexityTrend];
  }

  /**
   * Fetches historical trend records.
   */
  static async getHistoricalTrends(workspaceId: string | null, trendType?: string) {
    return prisma.organizationalTrend.findMany({
      where: {
        workspaceId,
        ...(trendType ? { trendType } : {})
      },
      orderBy: { timestamp: 'asc' }
    });
  }
}
