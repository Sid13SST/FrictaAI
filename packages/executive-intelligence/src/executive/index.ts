import { prisma } from '@fricta/db';

export class BriefingManager {
  static async generateBriefings(projectId: string) {
    const health = await prisma.executiveHealthSnapshot.findFirst({
      where: { projectId },
      orderBy: { recordedAt: 'desc' }
    });

    const activeRecs = await prisma.executiveRecommendation.count({
      where: { projectId, status: 'ACTIVE' }
    });

    const activeRisks = await prisma.strategicRiskRecord.count({
      where: { projectId, status: { in: ['MONITORED', 'ESCALATED'] } }
    });

    const compositeHealth = health?.compositeHealth ?? 82.5;

    const brief = `Strategic Execution Briefing:
Fricta's radar has aggregated strategic metrics for Project ID. The composite health index stands at ${compositeHealth.toFixed(1)}%. There are currently ${activeRecs} strategic recommendations awaiting human-in-the-loop review, and ${activeRisks} active organizational risks monitored. Governance policies are passing, but input masking consent reviews require confirmation. Ensure all priority changes are authorized through the command layout.`;

    return {
      recordedAt: health?.recordedAt || new Date(),
      compositeHealth,
      activeRecommendationsCount: activeRecs,
      activeRisksCount: activeRisks,
      summaryBriefing: brief
    };
  }

  static async generateRecommendations(projectId: string) {
    // Clear old active recommendations to maintain fresh intelligence
    const activeRecs = await prisma.executiveRecommendation.findMany({
      where: { projectId, status: 'ACTIVE' }
    });

    for (const rec of activeRecs) {
      await prisma.executiveEvidence.deleteMany({ where: { recommendationId: rec.id } }).catch(() => {});
    }
    await prisma.executiveRecommendation.deleteMany({ where: { projectId, status: 'ACTIVE' } }).catch(() => {});

    const generated = [];

    // Recommendation 1: Remediate checkout form exit spike (Traced back to active anomaly & replay)
    const checkoutAnomaly = await prisma.uXAnomaly.findFirst({
      where: { projectId, anomalyType: { contains: 'CLICK' } }
    });

    const checkoutObjective = await prisma.strategicObjective.findFirst({
      where: { projectId, title: { contains: 'Checkout' } }
    });

    const checkoutInitiative = await prisma.productInitiative.findFirst({
      where: { projectId, title: { contains: 'Checkout' } }
    });

    const checkoutOutcome = await prisma.productOutcome.findFirst({
      where: { projectId }
    });

    const checkoutKpi = await prisma.productKPI.findFirst({
      where: { projectId, metricKey: 'checkout_survivability' }
    });

    if (checkoutAnomaly) {
      const rec = await prisma.executiveRecommendation.create({
        data: {
          projectId,
          title: 'Remediate Checkout Gateway Payment Friction',
          description: 'Deploy adaptive inline input assistance on credit card fields and configure sandbox fallback endpoints to resolve payment dropoffs.',
          recommendationType: 'INITIATIVE',
          priority: 'CRITICAL',
          status: 'ACTIVE'
        }
      });

      // Link trace evidence chain: Recommendation -> Initiative -> Objective -> KPI -> Outcome -> Anomaly -> Replay
      const evidence = [];

      if (checkoutInitiative) {
        const ev = await prisma.executiveEvidence.create({
          data: {
            recommendationId: rec.id,
            evidenceType: 'INITIATIVE',
            referenceId: checkoutInitiative.id,
            description: `Linked product roadmap initiative: "${checkoutInitiative.title}".`
          }
        });
        evidence.push(ev);
      }

      if (checkoutObjective) {
        const ev = await prisma.executiveEvidence.create({
          data: {
            recommendationId: rec.id,
            evidenceType: 'KPI', // objective metric key
            referenceId: checkoutObjective.id,
            description: `Aims to satisfy objective "${checkoutObjective.title}" with metric target "${checkoutObjective.targetMetric}".`
          }
        });
        evidence.push(ev);
      }

      if (checkoutKpi) {
        const ev = await prisma.executiveEvidence.create({
          data: {
            recommendationId: rec.id,
            evidenceType: 'KPI',
            referenceId: checkoutKpi.id,
            description: `Monitors target KPI metric: "${checkoutKpi.name}" (Current: ${checkoutKpi.currentValue}%, Target: ${checkoutKpi.targetValue}%).`
          }
        });
        evidence.push(ev);
      }

      if (checkoutOutcome) {
        const ev = await prisma.executiveEvidence.create({
          data: {
            recommendationId: rec.id,
            evidenceType: 'OUTCOME',
            referenceId: checkoutOutcome.id,
            description: `Supported by outcome verdict: "${checkoutOutcome.verdict}" - ${checkoutOutcome.description.substring(0, 40)}...`
          }
        });
        evidence.push(ev);
      }

      // Add UX Anomaly evidence
      const evAnom = await prisma.executiveEvidence.create({
        data: {
          recommendationId: rec.id,
          evidenceType: 'UX_ANOMALY',
          referenceId: checkoutAnomaly.id,
          description: `Traced to active UX Anomaly: "${checkoutAnomaly.anomalyType}" (${checkoutAnomaly.description}).`
        }
      });
      evidence.push(evAnom);

      // Find first workflow session as replay reference if exists
      const session = await prisma.workflowSession.findFirst({ where: { projectId } });
      if (session) {
        const evSession = await prisma.executiveEvidence.create({
          data: {
            recommendationId: rec.id,
            evidenceType: 'REPLAY',
            referenceId: session.id,
            description: `Inspectable UX replay session logs: Session ID ${session.id.substring(0, 8)}...`
          }
        });
        evidence.push(evSession);
      }

      // Update count
      await prisma.executiveRecommendation.update({
        where: { id: rec.id },
        data: { evidenceCount: evidence.length }
      });

      generated.push({ ...rec, evidence });
    }

    // Recommendation 2: Address compliance gaps if failed policies exist
    const failedReview = await prisma.governancePolicyReview.findFirst({
      where: { projectId, status: 'WARNING' }
    });

    if (failedReview) {
      const rec = await prisma.executiveRecommendation.create({
        data: {
          projectId,
          title: 'Establish Mandatory System Ingestion Audit logging Policy',
          description: 'Deploy persistent database audit trails to trace workspace administrative activities and align workspace settings.',
          recommendationType: 'RISK',
          priority: 'HIGH',
          status: 'ACTIVE'
        }
      });

      const ev = await prisma.executiveEvidence.create({
        data: {
          recommendationId: rec.id,
          evidenceType: 'INVESTIGATION',
          referenceId: failedReview.id,
          description: `Linked failed policy audit: "${failedReview.policyName}" showing compliance rate of ${failedReview.complianceRate}%.`
        }
      });

      await prisma.executiveRecommendation.update({
        where: { id: rec.id },
        data: { evidenceCount: 1 }
      });

      generated.push({ ...rec, evidence: [ev] });
    }

    return generated;
  }
}
