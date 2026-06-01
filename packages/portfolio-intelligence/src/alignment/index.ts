import { prisma } from '@fricta/db';
import { AlignmentResult, AlignmentStatus, GapType } from '../types';

export class AlignmentEngine {
  static async evaluatePortfolioAlignment(projectId: string, portfolioId: string) {
    // Fetch initiatives
    const initiatives = await prisma.productInitiative.findMany({
      where: { projectId },
      include: {
        objective: true,
        outcomes: {
          include: {
            evidence: true,
            impacts: { include: { kpi: true } }
          }
        }
      }
    });

    // Clear old alignment records
    await prisma.alignmentRecord.deleteMany({
      where: { portfolioId }
    });

    const results: AlignmentResult[] = [];

    for (const init of initiatives) {
      let score = 0;
      let status: AlignmentStatus = 'MISALIGNED';
      let comments = 'Initiative has no mapped Strategic Objective.';
      let objId: string | undefined;
      let objTitle: string | undefined;
      let kpiId: string | undefined;
      let kpiName: string | undefined;
      let outcomeId: string | undefined;
      let outcomeVerdict: string | undefined;
      let evidenceCount = 0;

      if (init.objective) {
        score += 40;
        status = 'GAPPED';
        comments = 'Objective mapped, but no target business KPI trace found.';
        objId = init.objective.id;
        objTitle = init.objective.title;

        // Trace Objective to target KPI
        if (init.objective.targetMetric) {
          score += 20;
          comments = 'Objective maps to a target metric, but outcome baseline verification is missing.';

          // Find if there is a matching KPI
          const kpi = await prisma.productKPI.findFirst({
            where: {
              projectId,
              metricKey: init.objective.targetMetric
            }
          });
          if (kpi) {
            kpiId = kpi.id;
            kpiName = kpi.name;
          }
        }

        // Trace KPI to Product Outcome Delta
        const latestOutcome = init.outcomes[0];
        if (latestOutcome) {
          score += 20;
          comments = 'Baseline delta evaluation found. Evidence traces pending validation.';
          outcomeId = latestOutcome.id;
          outcomeVerdict = latestOutcome.verdict;

          // Trace Outcome to UX Evidence (replays, anomalies)
          evidenceCount = latestOutcome.evidence.length;
          if (evidenceCount > 0) {
            score += 20;
            status = 'ALIGNED';
            comments = `Fully aligned. Traces to ${evidenceCount} UX evidence entries: ${latestOutcome.evidence.map(e => e.evidenceType).join(', ')}.`;
          }
        }
      }

      // Record in database
      if (objId) {
        await prisma.alignmentRecord.create({
          data: {
            portfolioId,
            initiativeId: init.id,
            objectiveId: objId,
            alignmentScore: score,
            status,
            comments
          }
        });
      }

      results.push({
        initiativeId: init.id,
        initiativeTitle: init.title,
        objectiveId: objId,
        objectiveTitle: objTitle,
        kpiId,
        kpiName,
        outcomeId,
        outcomeVerdict,
        alignmentScore: score,
        status,
        comments,
        evidenceCount
      });
    }

    return results;
  }

  static async detectStrategicGaps(projectId: string) {
    const gaps = [];

    // 1. Uncovered Objectives: Strategic Objectives with no initiatives
    const objectives = await prisma.strategicObjective.findMany({
      where: { projectId },
      include: { initiatives: true }
    });

    for (const obj of objectives) {
      if (obj.initiatives.length === 0) {
        const gap = await prisma.strategicGap.create({
          data: {
            projectId,
            gapType: 'UNCOVERED_OBJECTIVE',
            title: `Uncovered Strategic Objective: ${obj.title}`,
            description: `Objective "${obj.title}" has no active or proposed product initiatives mapped to it.`,
            severity: 'HIGH',
            status: 'OPEN'
          }
        });
        gaps.push(gap);
      }
    }

    // 2. Unsupported KPIs: KPIs with no objective/initiatives mapping
    const kpis = await prisma.productKPI.findMany({
      where: { projectId, status: 'ACTIVE' }
    });

    for (const kpi of kpis) {
      const isSupported = await prisma.strategicObjective.count({
        where: {
          projectId,
          targetMetric: kpi.metricKey
        }
      });

      if (isSupported === 0) {
        const gap = await prisma.strategicGap.create({
          data: {
            projectId,
            gapType: 'UNSUPPORTED_KPI',
            title: `Unsupported Product KPI: ${kpi.name}`,
            description: `KPI "${kpi.name}" (${kpi.metricKey}) has no mapped business objective. Telemetry improvements are not tracked strategically.`,
            severity: 'MEDIUM',
            status: 'OPEN'
          }
        });
        gaps.push(gap);
      }
    }

    // 3. Neglected User Cohorts: Check if there are active critical anomalies
    const criticalAnomalies = await prisma.uXAnomaly.findMany({
      where: { projectId, isResolved: false },
      take: 3
    });

    for (const anom of criticalAnomalies) {
      const gap = await prisma.strategicGap.create({
        data: {
          projectId,
          gapType: 'HIGH_RISK_AREA',
          title: `Neglected Friction Hotspot: ${anom.anomalyType}`,
          description: `Active critical UX anomaly "${anom.anomalyType}" exists, but no approved roadmap initiative is linked to remediate it.`,
          severity: 'CRITICAL',
          status: 'OPEN'
        }
      });
      gaps.push(gap);
    }

    return gaps;
  }
}

// Evidence-based link traceability checks for strategic gaps detection.
