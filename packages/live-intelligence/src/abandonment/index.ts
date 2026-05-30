import { prisma } from '@fricta/db';
import { ThresholdValidator } from '../thresholds';
import { AnomalyCandidate } from '../anomalies';

export class AbandonmentDetector {
  /**
   * Detects abnormal spikes in form abandonment rates across recent sessions.
   * Defined as sessions that start typing in form fields but close/exit without completion events.
   */
  public static async checkFormAbandonment(
    projectId: string,
    appVersion: string
  ): Promise<AnomalyCandidate | null> {
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);

    // 1. Get active sessions with form interactions in the last 10 minutes
    const sessions = await prisma.liveSession.findMany({
      where: {
        projectId,
        lastActiveAt: { gte: tenMinsAgo },
      },
      include: {
        interactionEvents: {
          where: { action: 'INPUT' },
        },
        navigationEvents: true,
      },
    });

    const totalSessions = sessions.length;
    if (totalSessions < 2) return null;

    // Filter sessions that have typed in an input
    const formSessions = sessions.filter((s) => s.interactionEvents.length > 0);
    if (formSessions.length < 2) return null;

    const abandonedSessions: string[] = [];
    const fieldsAbandonedOn: Record<string, number> = {};

    for (const session of formSessions) {
      // Check if session contains a navigation to a success/completions page
      const hasCompleted = session.navigationEvents.some((nav) =>
        nav.toUrl.toLowerCase().includes('success') ||
        nav.toUrl.toLowerCase().includes('complete') ||
        nav.toUrl.toLowerCase().includes('thank-you')
      );

      const isInactive = Date.now() - new Date(session.lastActiveAt).getTime() > 2 * 60 * 1000; // inactive for 2 mins

      if (!hasCompleted && isInactive) {
        abandonedSessions.push(session.id);
        // Track the last field they typed in
        const lastInput = session.interactionEvents[session.interactionEvents.length - 1];
        if (lastInput) {
          fieldsAbandonedOn[lastInput.target] = (fieldsAbandonedOn[lastInput.target] || 0) + 1;
        }
      }
    }

    const abandonmentRate = abandonedSessions.length / formSessions.length;
    const evaluation = await ThresholdValidator.evaluateMetric(
      projectId,
      'form_abandonment_rate',
      abandonmentRate,
      appVersion
    );

    if (evaluation.isAnomalous) {
      // Find top field where users exited
      const topField = Object.entries(fieldsAbandonedOn).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown field';

      return {
        type: 'FORM_ABANDONMENT_SURGE',
        severity: 'HIGH',
        description: `Form Abandonment Surge detected: ${(abandonmentRate * 100).toFixed(1)}% of users who engaged with form fields exited the funnel prematurely, with most drop-offs clustering on field selector "${topField}". Baseline rate is ${(evaluation.expected * 100).toFixed(1)}%.`,
        contributingSessions: abandonedSessions,
        details: {
          rate: abandonmentRate,
          expected: evaluation.expected,
          topField,
          activeCount: formSessions.length,
          abandonedCount: abandonedSessions.length,
          explanation: evaluation.explanation,
        },
      };
    }

    return null;
  }

  /**
   * Identifies session drop-off clusters where users prematurely terminate their sessions on a specific route.
   */
  public static async checkSessionDropOffs(
    projectId: string,
    appVersion: string
  ): Promise<AnomalyCandidate | null> {
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);

    const sessions = await prisma.liveSession.findMany({
      where: {
        projectId,
        lastActiveAt: { gte: tenMinsAgo },
      },
      include: {
        navigationEvents: { orderBy: { timestamp: 'desc' } },
      },
    });

    const totalSessions = sessions.length;
    if (totalSessions < 2) return null;

    const inactiveSessions = sessions.filter(
      (s) => Date.now() - new Date(s.lastActiveAt).getTime() > 3 * 60 * 1000 // no activity for 3 mins
    );

    if (inactiveSessions.length < 2) return null;

    const exitRoutes: Record<string, number> = {};
    for (const session of inactiveSessions) {
      const lastNav = session.navigationEvents[0]; // ordered desc
      if (lastNav) {
        exitRoutes[lastNav.toUrl] = (exitRoutes[lastNav.toUrl] || 0) + 1;
      }
    }

    // Check if any route has a cluster of exits
    const sortedExits = Object.entries(exitRoutes).sort((a, b) => b[1] - a[1]);
    const topExit = sortedExits[0];

    if (topExit && topExit[1] >= 2 && topExit[1] / inactiveSessions.length >= 0.4) {
      const dropOffRate = topExit[1] / totalSessions;

      // Threshold evaluation relative to general navigation loop/abandonment index
      if (dropOffRate > 0.35) {
        const contributing = inactiveSessions
          .filter((s) => s.navigationEvents[0]?.toUrl === topExit[0])
          .map((s) => s.id);

        return {
          type: 'SESSION_DROP_OFF_CLUSTER',
          severity: 'HIGH',
          description: `Session Drop-Off Cluster detected: ${(dropOffRate * 100).toFixed(1)}% of active session terminations occurred on route "${topExit[0]}", indicating a potential navigation wall or usability bottleneck on that page.`,
          contributingSessions: contributing,
          details: {
            route: topExit[0],
            dropRate: dropOffRate,
            activeCount: totalSessions,
            clusterCount: topExit[1],
          },
        };
      }
    }

    return null;
  }
}
