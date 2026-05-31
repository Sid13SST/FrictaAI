import { prisma } from '@fricta/db';

export class ExecutiveHealthEngine {
  static async compileHealthScores(projectId: string) {
    // 1. Calculate Product KPI Score (mean of positive KPIs)
    const kpis = await prisma.productKPI.findMany({
      where: { projectId, status: 'ACTIVE' }
    });

    let kpiSum = 0;
    let kpiCount = 0;
    for (const kpi of kpis) {
      const isFriction = kpi.metricKey.includes('friction') || kpi.metricKey.includes('error') || kpi.metricKey.includes('abandonment');
      // Normalize: if friction is 30%, then performance score is 70%
      const normalizedValue = isFriction ? Math.max(100 - kpi.currentValue, 0) : kpi.currentValue;
      kpiSum += normalizedValue;
      kpiCount++;
    }
    const productScore = kpiCount > 0 ? kpiSum / kpiCount : 80.0;

    // 2. Calculate UX Score based on anomaly counts (fewer active anomalies = higher score)
    const activeAnomaliesCount = await prisma.uXAnomaly.count({
      where: { projectId, isResolved: false }
    });
    const uxScore = Math.max(100 - activeAnomaliesCount * 6, 40.0);

    // 3. Calculate Strategic Score based on completed vs total initiatives
    const totalInitiatives = await prisma.productInitiative.count({
      where: { projectId }
    });
    const approvedInitiatives = await prisma.productInitiative.count({
      where: { projectId, status: 'APPROVED' }
    });
    const strategicScore = totalInitiatives > 0 ? (approvedInitiatives / totalInitiatives) * 100 : 75.0;

    // 4. Save ProductHealthScore snapshot
    const scoreSnapshot = await prisma.productHealthScore.create({
      data: {
        projectId,
        productScore,
        uxScore,
        strategicScore
      }
    });

    return {
      productScore,
      uxScore,
      strategicScore,
      snapshotId: scoreSnapshot.id,
      recordedAt: scoreSnapshot.recordedAt
    };
  }
}
