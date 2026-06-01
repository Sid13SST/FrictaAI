import { prisma } from '@fricta/db';

export class OversightTimeline {
  static async getOversightTimelineEvents(projectId: string) {
    const [decisions, recommendations, policyReviews] = await Promise.all([
      prisma.decisionRecord.findMany({
        where: { recommendation: { projectId } },
        include: { recommendation: true, user: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.executiveRecommendation.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.governancePolicyReview.findMany({
        where: { projectId },
        orderBy: { checkedAt: 'desc' }
      })
    ]);

    const events = [];

    // Decisions
    for (const d of decisions) {
      events.push({
        id: d.id,
        eventType: 'DECISION',
        title: `Decision: ${d.action}`,
        description: `Recommendation "${d.recommendation.title}" was ${d.action.toLowerCase()}ed by ${d.user?.name || 'Administrator'}.${d.notes ? ' Notes: ' + d.notes : ''}`,
        timestamp: d.createdAt
      });
    }

    // Recommendations
    for (const r of recommendations) {
      events.push({
        id: r.id,
        eventType: 'RECOMMENDATION',
        title: `Recommendation Raised: ${r.title}`,
        description: `Advisory strategic recommendation created with priority: ${r.priority}.`,
        timestamp: r.createdAt
      });
    }

    // Policy Reviews
    for (const p of policyReviews) {
      events.push({
        id: p.id,
        eventType: 'GOVERNANCE',
        title: `Policy Audit: ${p.policyName}`,
        description: `Compliance rate evaluated: ${p.complianceRate}%. Status: ${p.status}.`,
        timestamp: p.checkedAt
      });
    }

    // Sort by timestamp descending
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}
