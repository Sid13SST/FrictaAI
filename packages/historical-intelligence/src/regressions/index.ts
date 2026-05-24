import { PrismaClient } from '@fricta/db';
import { SessionComparator } from '../comparisons';
import { logger } from '@fricta/shared';

export class RegressionTracker {
  constructor(private prisma: PrismaClient) {}

  /**
   * Evaluates regressions in the latest session against baseline(s).
   */
  async trackRegressions(projectId: string, latestSessionId: string, customBaselineId?: string) {
    logger.info({ projectId, latestSessionId, customBaselineId }, 'RegressionTracker analyzing regressions');

    // 1. Fetch current session
    const currentSession = await this.prisma.workflowSession.findUnique({
      where: { id: latestSessionId },
      include: { metrics: true, uxFindings: true, cognitiveSignals: true }
    });

    if (!currentSession) {
      logger.warn({ latestSessionId }, 'Current session not found for regression tracking');
      return [];
    }

    // 2. Resolve baseline session
    let baselineSession = null;
    if (customBaselineId) {
      baselineSession = await this.prisma.workflowSession.findUnique({
        where: { id: customBaselineId },
        include: { metrics: true, uxFindings: true, cognitiveSignals: true }
      });
    } else {
      // Find the immediately preceding session in this project
      baselineSession = await this.prisma.workflowSession.findFirst({
        where: {
          projectId,
          id: { not: latestSessionId },
          createdAt: { lt: currentSession.createdAt }
        },
        orderBy: { createdAt: 'desc' },
        include: { metrics: true, uxFindings: true, cognitiveSignals: true }
      });
    }

    if (!baselineSession) {
      logger.info('No baseline session found to compare regressions against');
      return [];
    }

    // 3. Compare sessions
    const comparison = SessionComparator.compare(baselineSession, currentSession);

    // Clean up old regressions for this comparison to prevent duplicates
    await this.prisma.workflowRegression.deleteMany({
      where: {
        projectId,
        evidenceSessionId: latestSessionId,
        baseSessionId: baselineSession.id
      }
    });

    // 4. Persist regressions to database
    const regressionRecords = [];
    for (const reg of comparison.regressions) {
      const record = await this.prisma.workflowRegression.create({
        data: {
          projectId,
          workflowPath: currentSession.goal || 'General Investigation',
          metricName: reg.metricName,
          baseValue: reg.baseValue,
          currentValue: reg.currentValue,
          deltaPercentage: reg.deltaPercentage,
          severity: reg.severity,
          explanation: reg.explanation,
          evidenceSessionId: latestSessionId,
          baseSessionId: baselineSession.id
        }
      });
      regressionRecords.push(record);
    }

    return regressionRecords;
  }
}
