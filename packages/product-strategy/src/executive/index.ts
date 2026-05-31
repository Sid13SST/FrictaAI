import { prisma } from '@fricta/db';

export class ExecutiveDashboardEngine {
  /**
   * Compiles and stores Product Health, UX Health, and Strategic Risk indices.
   */
  static async compileSnapshot(projectId: string) {
    // 1. Gather component values
    const [
      metrics,
      initiatives,
      risks,
      opportunities
    ] = await Promise.all([
      prisma.survivabilityMetric.findMany({
        where: { projectId },
        orderBy: { timestamp: 'desc' },
        take: 10
      }),
      prisma.productInitiative.findMany({
        where: { projectId }
      }),
      prisma.strategicRisk.findMany({
        where: { initiative: { projectId } }
      }),
      prisma.optimizationOpportunity.findMany({
        where: { projectId, status: 'ACTIVE' }
      })
    ]);

    // Calculate UX Health (mean of active survivability metrics, standardizing to 0-100)
    let uxHealthScore = 85.0; // default
    if (metrics.length > 0) {
      const sum = metrics.reduce((acc, m) => {
        // if metric is rate (0 to 1), convert to percent. If already percent or value, keep it.
        const val = m.value <= 1.0 ? m.value * 100 : m.value;
        return acc + val;
      }, 0);
      uxHealthScore = parseFloat((sum / metrics.length).toFixed(1));
    }

    // Calculate Strategic Risk Score
    // Unresolved risk severity weights: CRITICAL = 30, HIGH = 20, MEDIUM = 10, LOW = 5
    let totalRiskPoints = 0;
    for (const r of risks) {
      if (r.severity === 'CRITICAL') totalRiskPoints += 30;
      else if (r.severity === 'HIGH') totalRiskPoints += 20;
      else if (r.severity === 'MEDIUM') totalRiskPoints += 10;
      else totalRiskPoints += 5;
    }
    const strategicRiskScore = Math.min(totalRiskPoints, 100);

    // Compute overall Product Health Score
    // Bounded average: 70% UX Health + 30% Risk Inversion
    const productHealthScore = parseFloat((uxHealthScore * 0.7 + (100 - strategicRiskScore) * 0.3).toFixed(1));

    const opportunityPipelineCount = opportunities.length;
    const activeInitiativesCount = initiatives.filter(
      i => i.status === 'APPROVED' || i.status === 'IN_PROGRESS' || i.status === 'PLANNING'
    ).length;

    // 2. Persist Snapshot Record
    const snapshot = await prisma.productHealthSnapshot.create({
      data: {
        projectId,
        productHealthScore,
        strategicRiskScore,
        uxHealthScore,
        opportunityPipelineCount,
        activeInitiativesCount
      }
    });

    // 3. Update or Create ExecutiveMetric summaries
    const metricConfigs = [
      { name: 'product_health', value: productHealthScore },
      { name: 'strategic_risk', value: strategicRiskScore },
      { name: 'ux_health', value: uxHealthScore }
    ];

    for (const mc of metricConfigs) {
      const existing = await prisma.executiveMetric.findFirst({
        where: { projectId, metricName: mc.name }
      });
      if (existing) {
        let trend = 'STABLE';
        if (mc.value > existing.value) trend = 'IMPROVING';
        if (mc.value < existing.value) trend = 'DEGRADING';

        await prisma.executiveMetric.update({
          where: { id: existing.id },
          data: {
            value: mc.value,
            trend
          }
        });
      } else {
        await prisma.executiveMetric.create({
          data: {
            projectId,
            metricName: mc.name,
            value: mc.value,
            trend: 'STABLE'
          }
        });
      }
    }

    return {
      snapshot,
      uxHealthScore,
      strategicRiskScore,
      productHealthScore,
      opportunityPipelineCount,
      activeInitiativesCount
    };
  }
}
