import { prisma } from '@fricta/db';
import { ThresholdValidator } from '../thresholds';

export interface AnomalyCandidate {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  contributingSessions: string[]; // liveSessionIds
  details: any;
}

export class AnomalyRuleEngine {
  /**
   * Evaluates Rage Click Spikes across recent active sessions (last 10 minutes).
   */
  public static async checkRageClickSpikes(
    projectId: string,
    appVersion: string
  ): Promise<AnomalyCandidate | null> {
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);

    // 1. Get count of active sessions in the last 10 mins
    const activeSessions = await prisma.liveSession.findMany({
      where: {
        projectId,
        lastActiveAt: { gte: tenMinsAgo },
      },
      include: {
        frictionSignals: {
          where: {
            frictionType: 'RAGE_CLICK',
            timestamp: { gte: tenMinsAgo },
          },
        },
      },
    });

    const totalSessions = activeSessions.length;
    if (totalSessions < 2) return null; // Avoid divide-by-zero or low-sample alert noise

    // 2. Count sessions that experienced rage clicks
    const rageSessions = activeSessions.filter((s) => s.frictionSignals.length > 0);
    const rageRate = rageSessions.length / totalSessions;

    // 3. Compare to baseline
    const evaluation = await ThresholdValidator.evaluateMetric(projectId, 'rage_click_rate', rageRate, appVersion);

    if (evaluation.isAnomalous) {
      const severity = rageRate > 0.4 ? 'CRITICAL' : 'HIGH';
      return {
        type: 'RAGE_CLICK_SPIKE',
        severity,
        description: `Rage Click Spike detected: ${(rageRate * 100).toFixed(1)}% of active sessions experienced user clicks loops on unresponsive UI components, exceeding the normal baseline threshold of ${(evaluation.expected * 100).toFixed(1)}%.`,
        contributingSessions: rageSessions.map((s) => s.id),
        details: {
          rate: rageRate,
          expected: evaluation.expected,
          deviation: evaluation.deviationAmount,
          activeCount: totalSessions,
          rageCount: rageSessions.length,
          explanation: evaluation.explanation,
        },
      };
    }

    return null;
  }

  /**
   * Evaluates Navigation Loops (e.g. users stuck going A -> B -> A -> B -> A) in the last 10 minutes.
   */
  public static async checkNavigationLoops(
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
        navigationEvents: {
          where: { timestamp: { gte: tenMinsAgo } },
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    const totalSessions = activeSessions.length;
    if (totalSessions < 2) return null;

    const loopSessions: string[] = [];

    // Analyze transitions per session
    for (const session of activeSessions) {
      const navs = session.navigationEvents;
      if (navs.length < 5) continue;

      let loopCount = 0;
      // Sliding window of 5 navs to check for bouncing loop A -> B -> A -> B -> A
      for (let i = 0; i <= navs.length - 5; i++) {
        const n1 = navs[i];
        const n2 = navs[i + 1];
        const n3 = navs[i + 2];
        const n4 = navs[i + 3];
        const n5 = navs[i + 4];

        if (
          n1.toUrl === n3.toUrl &&
          n3.toUrl === n5.toUrl &&
          n1.fromUrl === n3.fromUrl &&
          n2.toUrl === n4.toUrl &&
          n1.toUrl !== n2.toUrl
        ) {
          loopCount++;
        }
      }

      if (loopCount > 0) {
        loopSessions.push(session.id);
      }
    }

    const loopRate = loopSessions.length / totalSessions;
    const evaluation = await ThresholdValidator.evaluateMetric(projectId, 'navigation_loop_rate', loopRate, appVersion);

    if (evaluation.isAnomalous) {
      return {
        type: 'NAV_LOOP_ESCALATION',
        severity: 'HIGH',
        description: `Navigation Loop Escalation detected: ${(loopRate * 100).toFixed(1)}% of sessions are trapped in circular navigation cycles (A → B → A → B), indicating broken routing flows or confusing links. Normal rate is ${(evaluation.expected * 100).toFixed(1)}%.`,
        contributingSessions: loopSessions,
        details: {
          rate: loopRate,
          expected: evaluation.expected,
          activeCount: totalSessions,
          loopCount: loopSessions.length,
          explanation: evaluation.explanation,
        },
      };
    }

    return null;
  }

  /**
   * Evaluates CTA Failure Surges (e.g. clicking buttons that trigger SCRIPT_ERROR or lead to zero progression).
   */
  public static async checkCTAFailures(
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
        interactionEvents: {
          where: { action: 'CLICK', timestamp: { gte: tenMinsAgo } },
          orderBy: { timestamp: 'asc' },
        },
        sessionSignals: {
          where: { signalType: 'SCRIPT_ERROR', timestamp: { gte: tenMinsAgo } },
        },
      },
    });

    const totalSessions = activeSessions.length;
    if (totalSessions < 2) return null;

    const failedCtaSessions: string[] = [];
    const targets: Record<string, number> = {};

    for (const session of activeSessions) {
      let hasCtaFailure = false;

      // Check if a click was followed by a script error in a short window
      for (const click of session.interactionEvents) {
        const errorAfterClick = session.sessionSignals.find((sig) => {
          const diffMs = sig.timestamp.getTime() - click.timestamp.getTime();
          return diffMs >= 0 && diffMs <= 4000; // error within 4 seconds of click
        });

        if (errorAfterClick) {
          hasCtaFailure = true;
          targets[click.target] = (targets[click.target] || 0) + 1;
        }
      }

      if (hasCtaFailure) {
        failedCtaSessions.push(session.id);
      }
    }

    const ctaFailureRate = failedCtaSessions.length / totalSessions;
    const evaluation = await ThresholdValidator.evaluateMetric(projectId, 'script_error_rate', ctaFailureRate, appVersion);

    if (evaluation.isAnomalous) {
      // Find top failed target
      const topTarget = Object.entries(targets).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown CTA';

      return {
        type: 'CTA_FAILURE_SURGE',
        severity: 'CRITICAL',
        description: `CTA Failure Surge detected: ${(ctaFailureRate * 100).toFixed(1)}% of sessions encountered script errors or fatal app exceptions directly after clicking primary CTA buttons (top affected selector: "${topTarget}").`,
        contributingSessions: failedCtaSessions,
        details: {
          rate: ctaFailureRate,
          expected: evaluation.expected,
          topTarget,
          activeCount: totalSessions,
          failedCount: failedCtaSessions.length,
          explanation: evaluation.explanation,
        },
      };
    }

    return null;
  }
}
