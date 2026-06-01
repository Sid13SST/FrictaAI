import { prisma } from '@fricta/db';

export class HealthSummaryEngine {
  static async calculateExecutiveHealth(projectId: string) {
    // 1. Fetch Product Health
    const prodHealthScore = await prisma.productHealthScore.findFirst({
      where: { projectId },
      orderBy: { recordedAt: 'desc' }
    });
    const productHealth = prodHealthScore?.productScore ?? 82.0;

    // 2. Fetch Strategic Health (mapped objective percentage)
    const totalObjs = await prisma.strategicObjective.count({ where: { projectId } });
    const mappedObjs = await prisma.strategicObjective.count({
      where: { projectId, initiatives: { some: {} } }
    });
    const strategicHealth = totalObjs > 0 ? (mappedObjs / totalObjs) * 100 : 75.0;

    // 3. Fetch Portfolio Health
    const portfolioHealthSnapshot = await prisma.portfolioHealthSnapshot.findFirst({
      where: { projectId },
      orderBy: { recordedAt: 'desc' }
    });
    const portfolioHealth = portfolioHealthSnapshot?.healthRating ?? 80.0;

    // 4. Fetch UX Health (anomalies rate inverse + metrics)
    const activeAnoms = await prisma.uXAnomaly.count({ where: { projectId, isResolved: false } });
    const uxHealth = Math.max(100 - activeAnoms * 10, 50.0);

    // 5. Fetch KPI Health (target convergence)
    const kpis = await prisma.productKPI.findMany({ where: { projectId, status: 'ACTIVE' } });
    let kpiSum = 0;
    for (const kpi of kpis) {
      const target = kpi.targetValue ?? 100.0;
      kpiSum += target > 0 ? (kpi.currentValue / target) * 100 : 100.0;
    }
    const kpiHealth = kpis.length > 0 ? Math.min(kpiSum / kpis.length, 100.0) : 85.0;

    // 6. Compute composite rating
    const compositeHealth = (productHealth * 0.25) + (strategicHealth * 0.25) + (portfolioHealth * 0.2) + (uxHealth * 0.15) + (kpiHealth * 0.15);

    // Save snapshot
    const snapshot = await prisma.executiveHealthSnapshot.create({
      data: {
        projectId,
        productHealth,
        strategicHealth,
        portfolioHealth,
        uxHealth,
        kpiHealth,
        compositeHealth
      }
    });

    return snapshot;
  }

  static async getExecutiveHealthHistory(projectId: string) {
    const snapshots = await prisma.executiveHealthSnapshot.findMany({
      where: { projectId },
      orderBy: { recordedAt: 'desc' },
      take: 12
    });

    let compositeSum = 0;
    let productSum = 0;
    let strategicSum = 0;
    let portfolioSum = 0;
    let uxSum = 0;
    let kpiSum = 0;
    const count = snapshots.length;

    for (const snap of snapshots) {
      compositeSum += snap.compositeHealth;
      productSum += snap.productHealth;
      strategicSum += snap.strategicHealth;
      portfolioSum += snap.portfolioHealth;
      uxSum += snap.uxHealth;
      kpiSum += snap.kpiHealth;
    }

    return {
      history: snapshots,
      averages: {
        compositeHealth: count > 0 ? compositeSum / count : 82.5,
        productHealth: count > 0 ? productSum / count : 84.0,
        strategicHealth: count > 0 ? strategicSum / count : 78.0,
        portfolioHealth: count > 0 ? portfolioSum / count : 80.0,
        uxHealth: count > 0 ? uxSum / count : 85.0,
        kpiHealth: count > 0 ? kpiSum / count : 86.0
      }
    };
  }
}
