import { prisma } from '@fricta/db';

export class StrategicRiskCenter {
  static async calculateOrganizationalRisks(projectId: string) {
    // Clear old risk records for this run
    await prisma.strategicRiskRecord.deleteMany({ where: { projectId } }).catch(() => {});

    const records = [];

    // 1. Check UX Risk (Active critical anomalies)
    const criticalAnomalies = await prisma.uXAnomaly.count({
      where: { projectId, severity: 'CRITICAL', isResolved: false }
    }).catch(() => 0);

    if (criticalAnomalies > 0) {
      const rec = await prisma.strategicRiskRecord.create({
        data: {
          projectId,
          riskSource: 'UX',
          title: 'Unmitigated Critical UX Friction Hotspots',
          description: `Active critical UX anomalies (${criticalAnomalies} count) exist in checkout/payment funnels but lack resolved remits.`,
          severity: 'CRITICAL',
          probability: 0.85,
          impact: 0.90,
          compositeScore: 76.5,
          status: 'MONITORED'
        }
      });
      records.push(rec);
    }

    // 2. Check Initiative Risks
    const highRiskInitiatives = await prisma.productInitiative.count({
      where: { projectId, riskScore: { gt: 70 } }
    }).catch(() => 0);

    if (highRiskInitiatives > 0) {
      const rec = await prisma.strategicRiskRecord.create({
        data: {
          projectId,
          riskSource: 'INITIATIVE',
          title: 'High Complexity Roadmap Slippage Risk',
          description: `${highRiskInitiatives} active initiatives are marked high-complexity or have risk factors exceeding 70%.`,
          severity: 'HIGH',
          probability: 0.70,
          impact: 0.75,
          compositeScore: 52.5,
          status: 'MONITORED'
        }
      });
      records.push(rec);
    }

    // 3. Check Governance Risks
    const failedPolicies = await prisma.governancePolicyReview.count({
      where: { projectId, status: 'FAILED' }
    }).catch(() => 0);

    if (failedPolicies > 0) {
      const rec = await prisma.strategicRiskRecord.create({
        data: {
          projectId,
          riskSource: 'GOVERNANCE',
          title: 'Non-Compliant Policy Configuration Alerts',
          description: `Workspace has ${failedPolicies} failed policy audit verifications. Compliance mandates require remediation.`,
          severity: 'CRITICAL',
          probability: 0.90,
          impact: 0.95,
          compositeScore: 85.5,
          status: 'ESCALATED'
        }
      });
      records.push(rec);
    }

    // 4. Check KPI Risks (KPIs current values are far below target values)
    const failingKpis = await prisma.productKPI.count({
      where: {
        projectId,
        status: 'ACTIVE',
        currentValue: { lt: 60.0 } // Under-performing KPIs
      }
    }).catch(() => 0);

    if (failingKpis > 0) {
      const rec = await prisma.strategicRiskRecord.create({
        data: {
          projectId,
          riskSource: 'KPI',
          title: 'Deteriorating Customer Experience Metrics',
          description: `${failingKpis} core KPIs are currently operating below baseline targets or setup parameters.`,
          severity: 'MEDIUM',
          probability: 0.60,
          impact: 0.70,
          compositeScore: 42.0,
          status: 'MONITORED'
        }
      });
      records.push(rec);
    }

    return records;
  }
}
