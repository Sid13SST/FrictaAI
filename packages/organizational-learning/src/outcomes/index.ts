import { prisma } from '@fricta/db';

export interface OutcomeStats {
  totalOutcomes: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  successRate: number;
  failureRate: number;
  averageDeltaPercent: number;
}

export class OutcomePatternAnalyzer {
  static async analyzeOutcomePatterns(projectId: string): Promise<OutcomeStats> {
    const outcomes = await prisma.productOutcome.findMany({
      where: { projectId }
    });

    const impacts = await prisma.initiativeImpact.findMany({
      where: { outcome: { projectId } }
    });

    const total = outcomes.length;
    const positive = outcomes.filter(o => o.verdict === 'POSITIVE').length;
    const negative = outcomes.filter(o => o.verdict === 'NEGATIVE').length;
    const neutral = outcomes.filter(o => o.verdict === 'NEUTRAL' || o.verdict === 'INCONCLUSIVE').length;

    const successRate = total > 0 ? (positive / total) * 100 : 0;
    const failureRate = total > 0 ? (negative / total) * 100 : 0;

    const totalDelta = impacts.reduce((acc, curr) => acc + curr.deltaPercent, 0);
    const averageDeltaPercent = impacts.length > 0 ? totalDelta / impacts.length : 0.0;

    return {
      totalOutcomes: total,
      positiveCount: positive,
      negativeCount: negative,
      neutralCount: neutral,
      successRate,
      failureRate,
      averageDeltaPercent
    };
  }
}
