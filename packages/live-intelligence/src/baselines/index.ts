import { prisma } from '@fricta/db';

export class BaselineManager {
  /**
   * Retrieves expected values for a specific metric in a project.
   * If a baseline record does not exist in the database, it dynamically creates a default
   * based on historical averages or static seed settings.
   */
  public static async getBaseline(
    projectId: string,
    metricName: string,
    baselineType: string,
    scopeKey: string
  ): Promise<{ expectedValue: number; standardDeviation: number }> {
    // 1. Query database for existing baseline
    const baseline = await prisma.productionBaseline.findFirst({
      where: {
        projectId,
        metricName,
        baselineType,
        scopeKey,
      },
    });

    if (baseline) {
      return {
        expectedValue: baseline.expectedValue,
        standardDeviation: baseline.standardDeviation,
      };
    }

    // 2. Return default fallback values if baseline is not found
    let expectedValue = 0.05; // 5% default rate for events
    let standardDeviation = 0.02;

    if (metricName === 'rage_click_rate') {
      expectedValue = 0.03; // average 3% of active sessions experience rage clicks
      standardDeviation = 0.015;
    } else if (metricName === 'script_error_rate') {
      expectedValue = 0.02; // average 2% experience uncaught JS exceptions
      standardDeviation = 0.01;
    } else if (metricName === 'form_abandonment_rate') {
      expectedValue = 0.15; // average 15% abandon checkout or forms
      standardDeviation = 0.05;
    } else if (metricName === 'navigation_loop_rate') {
      expectedValue = 0.04; // average 4% loop pages
      standardDeviation = 0.02;
    } else if (metricName === 'workflow_completion_rate') {
      expectedValue = 0.82; // average 82% workflow success rate
      standardDeviation = 0.06;
    } else if (metricName === 'cognitive_friction_score') {
      expectedValue = 0.12; // default friction index baseline
      standardDeviation = 0.04;
    }

    // Write default baseline record to keep database populated
    try {
      await prisma.productionBaseline.create({
        data: {
          projectId,
          metricName,
          baselineType,
          scopeKey,
          expectedValue,
          standardDeviation,
        },
      });
    } catch (err) {
      // Ignore unique constraints/db locks
      console.warn('[BaselineManager] Failed to create default baseline:', err);
    }

    return { expectedValue, standardDeviation };
  }

  /**
   * Seeds default baselines for a new project version or deployment to allow comparisons.
   */
  public static async seedBaselinesForProject(projectId: string, versionKey: string): Promise<void> {
    const metrics = [
      { name: 'rage_click_rate', val: 0.04, sd: 0.015 },
      { name: 'script_error_rate', val: 0.02, sd: 0.01 },
      { name: 'form_abandonment_rate', val: 0.15, sd: 0.04 },
      { name: 'navigation_loop_rate', val: 0.05, sd: 0.02 },
      { name: 'workflow_completion_rate', val: 0.85, sd: 0.05 },
      { name: 'cognitive_friction_score', val: 0.11, sd: 0.03 },
    ];

    for (const m of metrics) {
      const exists = await prisma.productionBaseline.findFirst({
        where: { projectId, metricName: m.name, scopeKey: versionKey },
      });
      if (!exists) {
        await prisma.productionBaseline.create({
          data: {
            projectId,
            metricName: m.name,
            baselineType: 'VERSION',
            scopeKey: versionKey,
            expectedValue: m.val,
            standardDeviation: m.sd,
          },
        });
      }
    }
  }
}
