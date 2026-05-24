import { PrismaClient } from '@fricta/db';
import { logger } from '@fricta/shared';

export interface FrictionHeatmapPoint {
  pageUrl: string;
  severity: string;
  count: number;
}

export class OrganizationalAnalyticsManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generates stability index scores and heatmaps for the organization.
   */
  async generateAnalytics(projectId: string, sessions: any[]) {
    logger.info({ projectId }, 'OrganizationalAnalyticsManager running analytics engine');

    // 1. Calculate Stability Index (0-100 score per session)
    // Formula: 100 - (Failures * 30) - (High/Critical findings * 15) - (Regressions * 10) - (Overloads * 5)
    // Clamped between 10 and 100
    const stabilityTrend = [];
    const regressions = await this.prisma.workflowRegression.findMany({ where: { projectId } });

    for (const s of sessions) {
      let score = 100;
      if (s.status === 'FAILED') score -= 30;

      const criticalFindings = s.uxFindings?.filter((f: any) => f.severity === 'CRITICAL' || f.severity === 'HIGH').length || 0;
      score -= criticalFindings * 15;

      const sessionRegressions = regressions.filter(r => r.evidenceSessionId === s.id).length;
      score -= sessionRegressions * 10;

      const overloads = s.cognitiveSignals?.filter((sig: any) => sig.signalType === 'COGNITIVE_OVERLOAD' && sig.intensity > 0.70).length || 0;
      score -= overloads * 5;

      const stabilityScore = Math.max(10, Math.min(100, score));
      stabilityTrend.push({
        sessionId: s.id,
        score: stabilityScore,
        createdAt: s.createdAt
      });
    }

    // 2. Build Friction Heatmap (pageUrl vs severity)
    const heatmap: Record<string, Record<string, number>> = {};
    for (const s of sessions) {
      if (s.uxFindings) {
        for (const finding of s.uxFindings) {
          const rawUrl = finding.evidence || 'General';
          // Clean up url string to extract path/base
          const cleanUrl = rawUrl.startsWith('http') 
            ? new URL(rawUrl).pathname || '/' 
            : rawUrl.split(' ')[0] || 'General';

          const sev = finding.severity || 'LOW';
          if (!heatmap[cleanUrl]) {
            heatmap[cleanUrl] = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
          }
          heatmap[cleanUrl][sev] = (heatmap[cleanUrl][sev] || 0) + 1;
        }
      }
    }

    const heatmapPoints: FrictionHeatmapPoint[] = [];
    for (const [pageUrl, sevs] of Object.entries(heatmap)) {
      for (const [severity, count] of Object.entries(sevs)) {
        if (count > 0) {
          heatmapPoints.push({ pageUrl, severity, count });
        }
      }
    }

    // 3. Clear and persist new Organizational Insights
    await this.prisma.organizationalInsight.deleteMany({
      where: { projectId }
    });

    const averageStability = stabilityTrend.length > 0 
      ? stabilityTrend.reduce((sum, item) => sum + item.score, 0) / stabilityTrend.length 
      : 85;

    // Create stability trend insight
    await this.prisma.organizationalInsight.create({
      data: {
        projectId,
        title: 'Longitudinal UX Stability Index',
        summary: `Average UX stability is rated at ${averageStability.toFixed(1)}/100. Recent runs indicate standard operational health.`,
        insightCategory: 'STABILITY',
        impactScore: parseFloat((averageStability / 100).toFixed(2)),
        metrics: { stabilityTrend, heatmapPoints } as any
      }
    });

    return {
      stabilityTrend,
      heatmapPoints,
      averageStability
    };
  }
}
