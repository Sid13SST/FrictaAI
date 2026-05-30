import { prisma } from '@fricta/db';

export class TimelineManager {
  /**
   * Constructs a historical activity timeline of decisions, outcomes, and discoveries.
   * This implements complete operational traceability and explainability, so that
   * any administrator can audit why a recommendation was approved or rejected.
   */
  static async getProjectTimeline(projectId: string) {
    const [decisions, recommendations, outcomes] = await Promise.all([
      prisma.recommendationDecision.findMany({
        where: { recommendation: { projectId } },
        orderBy: { decidedAt: 'desc' },
        include: { recommendation: true }
      }),
      prisma.initiativeRecommendation.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.optimizationOutcome.findMany({
        where: { recommendation: { projectId } },
        orderBy: { evaluatedAt: 'desc' },
        include: { recommendation: true }
      })
    ]);

    const events = [
      ...decisions.map((d: any) => ({
        id: d.id,
        type: 'DECISION',
        title: `Recommendation ${d.action.replace(/_/g, ' ')}`,
        description: `Decision made on "${d.recommendation.title}" by user. Action: ${d.action}. Comments: ${d.comments ?? 'none'}.`,
        timestamp: d.decidedAt,
      })),
      ...recommendations.map((r: any) => ({
        id: r.id,
        type: 'CREATION',
        title: 'New Opportunity Detected',
        description: `Opportunity identified: "${r.title}". Score: ${r.score.toFixed(0)}.`,
        timestamp: r.createdAt,
      })),
      ...outcomes.map((o: any) => ({
        id: o.id,
        type: 'OUTCOME',
        title: `Outcome Logged: ${o.verdict}`,
        description: `Evaluation for "${o.recommendation.title}" complete. Baseline: ${o.baselineValue.toFixed(2)}, Actual: ${o.actualValue.toFixed(2)} (Delta: ${o.deltaPercent > 0 ? '+' : ''}${o.deltaPercent.toFixed(1)}%).`,
        timestamp: o.evaluatedAt,
      }))
    ];

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}
