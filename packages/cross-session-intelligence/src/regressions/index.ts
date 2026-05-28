import { prisma } from '@fricta/db';
import { RegressionDetail } from '../types';

export class UsabilityRegressionAnalyzer {
  /**
   * Computes version-over-version regressions for a project.
   */
  static async analyzeRegressions(projectId: string, workspaceId: string | null) {
    // 1. Fetch historical baselines
    const baselines = await prisma.historicalBaseline.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 2
    });

    if (baselines.length < 2) {
      return [];
    }

    const base = baselines[1]; // Older baseline
    const compare = baselines[0]; // Recent baseline

    const regressions: any[] = [];

    // Compare metrics
    const metricsToCompare = [
      { key: 'successRate', name: 'Task Completion Rate' },
      { key: 'averageFriction', name: 'Friction Index' },
      { key: 'cognitiveLoadAverage', name: 'Average Cognitive Load' }
    ];

    for (const m of metricsToCompare) {
      const baseVal = (base as any)[m.key] || 0;
      const compareVal = (compare as any)[m.key] || 0;

      if (baseVal === 0) continue;

      const delta = compareVal - baseVal;
      const pctChange = (delta / baseVal) * 100;

      let status: 'IMPROVED' | 'STABLE' | 'DEGRADED' = 'STABLE';
      if (m.key === 'successRate') {
        if (pctChange < -5) status = 'DEGRADED';
        else if (pctChange > 5) status = 'IMPROVED';
      } else {
        // Friction Index & Cognitive Load (lower is better)
        if (pctChange > 5) status = 'DEGRADED';
        else if (pctChange < -5) status = 'IMPROVED';
      }

      if (status === 'DEGRADED') {
        // Save regression to DB
        const reg = await prisma.historicalRegression.create({
          data: {
            workspaceId,
            projectId,
            metricName: m.name,
            baseVersion: base.name || 'v1.0',
            compareVersion: compare.name || 'v1.1',
            baseValue: baseVal,
            compareValue: compareVal,
            changePercent: pctChange,
            status,
            triggerSignals: {
              signals: [`Longterm drift in ${m.name}`],
              elements: []
            }
          }
        });
        regressions.push(reg);
      }
    }

    return regressions;
  }

  /**
   * Fetches active regressions.
   */
  static async getRegressions(projectId: string, workspaceId: string | null) {
    return prisma.historicalRegression.findMany({
      where: {
        projectId,
        workspaceId
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
