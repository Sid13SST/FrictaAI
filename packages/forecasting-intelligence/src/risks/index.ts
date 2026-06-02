import { prisma } from '@fricta/db';

export class EmergingRiskDetector {
  static async detectEmergingRisks(projectId: string) {
    const logs: string[] = [];

    const saveRisk = async (
      type: 'KPI_RISK' | 'UX_RISK' | 'STRATEGIC_RISK' | 'INITIATIVE_RISK' | 'GOVERNANCE_RISK',
      title: string,
      description: string,
      severity: number,
      probability: number,
      triggerCondition: string
    ) => {
      const existing = await prisma.emergingRisk.findFirst({
        where: { projectId, title, riskType: type }
      });

      if (existing) {
        await prisma.emergingRisk.update({
          where: { id: existing.id },
          data: { severity, probability, isDetected: true, detectedAt: new Date() }
        });
      } else {
        await prisma.emergingRisk.create({
          data: {
            projectId,
            riskType: type,
            title,
            description,
            severity,
            probability,
            triggerCondition,
            isDetected: true,
            detectedAt: new Date()
          }
        });
      }
      logs.push(`Detected emerging risk [${type}]: "${title}" (Probability: ${Math.round(probability * 100)}%)`);
    };

    // 1. KPI Risk: check for deteriorating KPIs
    const kpis = await prisma.productKPI.findMany({ where: { projectId } });
    for (const k of kpis) {
      if (k.targetValue !== null && k.currentValue < k.targetValue * 0.7) {
        await saveRisk(
          'KPI_RISK',
          `Critical performance drop: ${k.name}`,
          `Target KPI "${k.name}" current value (${k.currentValue}) falls below 70% of target bounds (${k.targetValue}).`,
          8.5,
          0.85,
          `KPI value < ${k.targetValue * 0.7}`
        );
      }
    }

    // 2. UX Risk: check for critical unresolved UX anomalies
    const anomalies = await prisma.uXAnomaly.findMany({
      where: { projectId, severity: 'CRITICAL', isResolved: false }
    });
    if (anomalies.length > 0) {
      await saveRisk(
        'UX_RISK',
        'Unresolved Critical UX Anomalies',
        `Discovered ${anomalies.length} active critical UX anomalies (rage clicks, drop-offs) in the project workspace.`,
        9.0,
        0.95,
        `Unresolved critical anomalies > 0`
      );
    }

    // 3. Strategic Risk: check for unaligned or gap objectives
    const gaps = await prisma.strategicGap?.findMany({ where: { projectId } }) || [];
    if (gaps.length > 0) {
      await saveRisk(
        'STRATEGIC_RISK',
        'Unaligned Objectives Gap Spike',
        `Product portfolio contains ${gaps.length} strategic alignment gaps without active initiative support.`,
        7.0,
        0.75,
        `Strategic gap count > 0`
      );
    }

    // 4. Initiative Risk: check for blocking dependency risk scores
    const dependencies = await prisma.dependencyRecord?.findMany({
      where: { projectId, dependencyType: 'BLOCKING', riskScore: { gt: 60.0 } }
    }) || [];
    if (dependencies.length > 0) {
      await saveRisk(
        'INITIATIVE_RISK',
        'Roadmap Dependency Pipeline Bottleneck',
        `Critical blocking dependency detects propagated risk scores higher than 60% on roadmap pipeline.`,
        8.0,
        0.80,
        `Blocking dependency risk score > 60.0`
      );
    }

    // 5. Governance Risk: check for failing policy reviews
    const policies = await prisma.governancePolicyReview?.findMany({
      where: { projectId, complianceRate: { lt: 0.8 } }
    }) || [];
    if (policies.length > 0) {
      await saveRisk(
        'GOVERNANCE_RISK',
        'RBAC Security Compliance Drift',
        `Workspace compliance audit rates fell below the 80% security threshold.`,
        7.5,
        0.70,
        `Policy compliance rate < 80%`
      );
    }

    return logs;
  }
}

// Emerging risk severity threshold classifications: KPI, UX, and strategic indicators.
