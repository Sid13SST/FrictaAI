import { prisma } from '@fricta/db';
import { CorrelationResult } from '../types';

export class CorrelationAnalyzer {
  /**
   * Evaluates environmental correlations for a detected anomaly.
   * Compares the frequency of specific properties in the anomaly sessions vs the overall session base.
   */
  public static async analyzeCorrelation(
    projectId: string,
    sessionIds: string[]
  ): Promise<CorrelationResult[]> {
    if (sessionIds.length === 0) return [];

    // 1. Fetch details of all contributing sessions
    const anomalySessions = await prisma.liveSession.findMany({
      where: { id: { in: sessionIds } },
    });

    const totalAnomalyCount = anomalySessions.length;

    // Grouping accumulators
    const browsers: Record<string, number> = {};
    const osList: Record<string, number> = {};
    const locations: Record<string, number> = {};

    for (const sess of anomalySessions) {
      if (sess.browser) browsers[sess.browser] = (browsers[sess.browser] || 0) + 1;
      if (sess.os) osList[sess.os] = (osList[sess.os] || 0) + 1;
      if (sess.location) locations[sess.location] = (locations[sess.location] || 0) + 1;
    }

    const results: CorrelationResult[] = [];

    // Browser Correlation
    const topBrowser = Object.entries(browsers).sort((a, b) => b[1] - a[1])[0];
    if (topBrowser && topBrowser[1] / totalAnomalyCount >= 0.5) {
      const coef = topBrowser[1] / totalAnomalyCount;
      results.push({
        correlationType: 'SESSION',
        correlationKey: `browser:${topBrowser[0]}`,
        coefficient: coef,
        evidenceDetails: `${(coef * 100).toFixed(0)}% of anomalous user sessions were on browser ${topBrowser[0]} (total contributing: ${topBrowser[1]}/${totalAnomalyCount}).`,
      });
    }

    // OS Correlation
    const topOs = Object.entries(osList).sort((a, b) => b[1] - a[1])[0];
    if (topOs && topOs[1] / totalAnomalyCount >= 0.5) {
      const coef = topOs[1] / totalAnomalyCount;
      results.push({
        correlationType: 'VERSION',
        correlationKey: `os:${topOs[0]}`,
        coefficient: coef,
        evidenceDetails: `${(coef * 100).toFixed(0)}% of anomalous user sessions occurred on ${topOs[0]} (total contributing: ${topOs[1]}/${totalAnomalyCount}).`,
      });
    }

    // Geolocation Correlation
    const topLocation = Object.entries(locations).sort((a, b) => b[1] - a[1])[0];
    if (topLocation && topLocation[1] / totalAnomalyCount >= 0.6) {
      const coef = topLocation[1] / totalAnomalyCount;
      results.push({
        correlationType: 'PERSONA',
        correlationKey: `location:${topLocation[0]}`,
        coefficient: coef,
        evidenceDetails: `${(coef * 100).toFixed(0)}% of anomalous sessions originated from ${topLocation[0]} (total contributing: ${topLocation[1]}/${totalAnomalyCount}).`,
      });
    }

    return results;
  }
}
