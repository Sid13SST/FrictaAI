import { prisma } from '@fricta/db';
import { ThresholdValidator } from '../thresholds';
import { AnomalyCandidate } from '../anomalies';

export class FrictionAnalyzer {
  /**
   * Calculates cognitive friction levels and checks for Cognitive Friction Escalation anomalies.
   * Derived from hesitation, rage clicks, and excessive back-button transitions.
   */
  public static async checkFrictionEscalation(
    projectId: string,
    appVersion: string
  ): Promise<AnomalyCandidate | null> {
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);

    const activeSessions = await prisma.liveSession.findMany({
      where: {
        projectId,
        lastActiveAt: { gte: tenMinsAgo },
      },
      include: {
        frictionSignals: {
          where: { timestamp: { gte: tenMinsAgo } },
        },
        interactionEvents: {
          where: { timestamp: { gte: tenMinsAgo } },
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    const totalSessions = activeSessions.length;
    if (totalSessions < 2) return null;

    let totalFrictionScore = 0;
    const elevatedSessions: string[] = [];

    for (const session of activeSessions) {
      let sessionScore = 0;

      // 1. Incorporate direct friction signals (RAGE_CLICK, etc.)
      const signalFriction = session.frictionSignals.reduce((acc, sig) => acc + sig.score, 0);
      sessionScore += signalFriction;

      // 2. Hesitation logic: average time gap between clicks
      if (session.interactionEvents.length > 2) {
        let totalGap = 0;
        for (let i = 1; i < session.interactionEvents.length; i++) {
          const prev = session.interactionEvents[i - 1];
          const curr = session.interactionEvents[i];
          const diffSeconds = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000;
          totalGap += diffSeconds;
        }
        const avgHesitation = totalGap / (session.interactionEvents.length - 1);
        if (avgHesitation > 8.0) {
          sessionScore += 0.2; // Add minor score for high average hesitation
        }
      }

      totalFrictionScore += sessionScore;

      if (sessionScore > 0.6) {
        elevatedSessions.push(session.id);
      }
    }

    const averageFriction = totalFrictionScore / totalSessions;
    const evaluation = await ThresholdValidator.evaluateMetric(
      projectId,
      'cognitive_friction_score',
      averageFriction,
      appVersion
    );

    if (evaluation.isAnomalous) {
      const severity = averageFriction > 0.35 ? 'CRITICAL' : 'HIGH';
      return {
        type: 'COGNITIVE_FRICTION_ESCALATION',
        severity,
        description: `Cognitive Friction Escalation detected: Average friction score rose to ${averageFriction.toFixed(2)} (baseline: ${evaluation.expected.toFixed(2)}), driven by user hesitation and repeated interface barriers.`,
        contributingSessions: elevatedSessions,
        details: {
          score: averageFriction,
          expected: evaluation.expected,
          activeCount: totalSessions,
          elevatedCount: elevatedSessions.length,
          explanation: evaluation.explanation,
        },
      };
    }

    return null;
  }
}
