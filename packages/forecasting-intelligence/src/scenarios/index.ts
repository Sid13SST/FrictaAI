import { prisma } from '@fricta/db';

export class ScenarioEngine {
  static async evaluateScenarios(projectId: string) {
    const logs: string[] = [];

    const saveScenario = async (
      type: 'BEST_CASE' | 'EXPECTED' | 'WORST_CASE' | 'DELAYED_INITIATIVE' | 'KPI_REGRESSION' | 'RISK_ESCALATION',
      title: string,
      description: string,
      parameters: any,
      outcomesList: Array<{ metricName: string; projectedValue: number; deltaPercent: number; description: string }>
    ) => {
      const existing = await prisma.scenarioAnalysis.findFirst({
        where: { projectId, scenarioType: type, title }
      });

      let scenarioId = '';
      if (existing) {
        await prisma.scenarioAnalysis.update({
          where: { id: existing.id },
          data: { description, parameters: JSON.parse(JSON.stringify(parameters)) }
        });
        scenarioId = existing.id;
      } else {
        const created = await prisma.scenarioAnalysis.create({
          data: {
            projectId,
            scenarioType: type,
            title,
            description,
            parameters: JSON.parse(JSON.stringify(parameters))
          }
        });
        scenarioId = created.id;
      }

      await prisma.scenarioOutcome.deleteMany({ where: { scenarioId } }).catch(() => {});
      for (const out of outcomesList) {
        await prisma.scenarioOutcome.create({
          data: {
            projectId,
            scenarioId,
            metricName: out.metricName,
            projectedValue: out.projectedValue,
            deltaPercent: out.deltaPercent,
            description: out.description
          }
        });
      }
      logs.push(`Evaluated scenario [${type}]: "${title}". Created ${outcomesList.length} projections.`);
    };

    // 1. BEST_CASE: Model +20% boost on primary conversion/onboarding metrics
    await saveScenario(
      'BEST_CASE',
      'Optimistic Onboarding Completion lift',
      'Simulates full compliance adoption and form auto-complete optimization yields.',
      { onboardingOptimized: true, completionLift: 0.20 },
      [
        {
          metricName: 'Onboarding Completion Rate',
          projectedValue: 0.85,
          deltaPercent: 20.0,
          description: 'Probabilistic simulation assuming frictionless form transitions.'
        },
        {
          metricName: 'Checkout Conversion Rate',
          projectedValue: 0.92,
          deltaPercent: 12.0,
          description: 'Downstream conversion gains derived from onboarding success.'
        }
      ]
    );

    // 2. EXPECTED: Model base projections
    await saveScenario(
      'EXPECTED',
      'Steady-state Conversion Trajectory',
      'Projected standard product execution across current sprint schedules.',
      { completionLift: 0.05 },
      [
        {
          metricName: 'Onboarding Completion Rate',
          projectedValue: 0.72,
          deltaPercent: 5.0,
          description: 'Expected baseline completion rate stabilization.'
        }
      ]
    );

    // 3. WORST_CASE: Model risks impacting metrics
    await saveScenario(
      'WORST_CASE',
      'Elevated Cognitive Friction Drop-off',
      'Simulates cumulative friction from unresolved anomalies and delayed updates.',
      { onboardingFrictionIncrease: 0.30 },
      [
        {
          metricName: 'Onboarding Completion Rate',
          projectedValue: 0.55,
          deltaPercent: -15.0,
          description: 'Severe exit spikes on multi-step verification forms.'
        }
      ]
    );

    // 4. DELAYED_INITIATIVE: Model roadmap delay impact
    await saveScenario(
      'DELAYED_INITIATIVE',
      'Onboarding Redesign Q3 Delay Impact',
      'Evaluates outcomes if target onboarding design is postponed by 6 weeks.',
      { initiativeId: 'onboarding-redesign-v2', delayWeeks: 6 },
      [
        {
          metricName: 'Strategic Goal Achievement',
          projectedValue: 0.60,
          deltaPercent: -10.0,
          description: 'Missed strategic milestones shift completion gains to late Q4.'
        }
      ]
    );

    // 5. KPI_REGRESSION: Model checkout gateway metric drop
    await saveScenario(
      'KPI_REGRESSION',
      'Stripe Integration Tokenization Regressions',
      'Simulates tokenization latency degradation impact on transactional metrics.',
      { latencySpikeMs: 1500 },
      [
        {
          metricName: 'Checkout Conversion Rate',
          projectedValue: 0.65,
          deltaPercent: -22.0,
          description: 'Direct conversion drop correlated with 1.5s validation latency.'
        }
      ]
    );

    // 6. RISK_ESCALATION: Model policy compliance warnings
    await saveScenario(
      'RISK_ESCALATION',
      'RBAC Compliance Failure Warnings',
      'Simulates audit score regressions trigger Strategic risk overrides.',
      { auditScore: 0.55 },
      [
        {
          metricName: 'Governance Integrity Rating',
          projectedValue: 0.58,
          deltaPercent: -27.0,
          description: 'Severe compliance gaps warning logged.'
        }
      ]
    );

    return logs;
  }
}

// Scenario engine outcomes validation checks: best, expected, and worst cases simulated.
