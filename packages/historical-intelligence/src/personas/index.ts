import { PrismaClient } from '@fricta/db';
import { logger } from '@fricta/shared';

export class PersonaTrendTracker {
  constructor(private prisma: PrismaClient) {}

  /**
   * Analyzes persona behaviors across all project sessions.
   */
  async trackPersonaTrends(projectId: string) {
    logger.info({ projectId }, 'PersonaTrendTracker calculating trends');

    const sessions = await this.prisma.workflowSession.findMany({
      where: { projectId },
      include: { metrics: true, uxFindings: true, cognitiveSignals: true },
      orderBy: { createdAt: 'desc' }
    });

    if (sessions.length === 0) return [];

    // Group sessions by persona
    const personaGroups: Record<string, any[]> = {};
    for (const session of sessions) {
      const p = session.persona || 'STANDARD';
      if (!personaGroups[p]) {
        personaGroups[p] = [];
      }
      personaGroups[p].push(session);
    }

    const trends = [];

    for (const [personaType, group] of Object.entries(personaGroups)) {
      if (group.length === 0) continue;

      // 1. Success rate trend
      const completedCount = group.filter(s => s.status === 'COMPLETED').length;
      const successRate = completedCount / group.length;

      // 2. Average hesitation (discoverability delay)
      const totalHesitations = group.reduce((sum, s) => {
        const hesitations = s.uxFindings?.filter((f: any) => f.findingType === 'HESITATION').length || 0;
        return sum + hesitations;
      }, 0);
      const avgHesitation = totalHesitations / group.length;

      // 3. Average decision delay (cognitive signals intensity)
      const totalCognitive = group.reduce((sum, s) => {
        const cognitive = s.cognitiveSignals?.reduce((subSum: number, sig: any) => subSum + (sig.intensity || 0), 0) || 0;
        return sum + cognitive;
      }, 0);
      const avgCognitive = totalCognitive / group.length;

      // Evaluate trend direction (IMPROVING / STABLE / DEGRADING) by comparing recent vs older half
      let direction = 'STABLE';
      if (group.length >= 4) {
        const mid = Math.floor(group.length / 2);
        const recentHalf = group.slice(0, mid);
        const olderHalf = group.slice(mid);

        const recentHesitations = recentHalf.reduce((sum, s) => sum + (s.uxFindings?.filter((f: any) => f.findingType === 'HESITATION').length || 0), 0) / recentHalf.length;
        const olderHesitations = olderHalf.reduce((sum, s) => sum + (s.uxFindings?.filter((f: any) => f.findingType === 'HESITATION').length || 0), 0) / olderHalf.length;

        if (recentHesitations < olderHesitations - 0.5) {
          direction = 'IMPROVING';
        } else if (recentHesitations > olderHesitations + 0.5) {
          direction = 'DEGRADING';
        }
      }

      // Clear existing records to keep it clean and performant
      await this.prisma.personaTrend.deleteMany({
        where: { projectId, personaType }
      });

      // Save Success Rate Trend
      const successTrend = await this.prisma.personaTrend.create({
        data: {
          projectId,
          personaType,
          metricName: 'SUCCESS_RATE',
          trendDirection: successRate >= 0.8 ? 'STABLE' : 'DEGRADING',
          averageValue: parseFloat(successRate.toFixed(2)),
          observation: `Overall success rate is ${(successRate * 100).toFixed(0)}% across ${group.length} runs.`,
          sampleCount: group.length
        }
      });
      trends.push(successTrend);

      // Save Hesitation Trend
      const hesitationTrend = await this.prisma.personaTrend.create({
        data: {
          projectId,
          personaType,
          metricName: 'AVERAGE_HESITATIONS',
          trendDirection: direction,
          averageValue: parseFloat(avgHesitation.toFixed(2)),
          observation: `Averages ${avgHesitation.toFixed(1)} hesitation markers per session. Trend is currently ${direction.toLowerCase()}.`,
          sampleCount: group.length
        }
      });
      trends.push(hesitationTrend);
    }

    return trends;
  }
}
