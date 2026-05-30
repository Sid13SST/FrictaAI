import { prisma } from '@fricta/db';
import type { MemoryPattern } from '../types';

// ─── Optimization Learner ─────────────────────────────────────────────────────
// Persistent organizational UX memory system.
// Stores what worked and what didn't — all records remain inspectable.
// No hidden chain-of-thought — only recorded facts and outcomes.

export class OptimizationLearner {
  /**
   * Store a successful or failed experiment pattern in organizational memory.
   */
  static async store(projectId: string, pattern: MemoryPattern) {
    return prisma.optimizationMemory.create({
      data: {
        projectId,
        memoryType:    pattern.memoryType,
        patternKey:    pattern.patternKey,
        patternSummary: pattern.patternSummary,
        outcomeType:   pattern.outcomeType,
        metricImpacted: pattern.metricImpacted,
        deltaAchieved: pattern.deltaAchieved,
        experimentId:  pattern.experimentId,
        evidenceDetails: pattern.evidenceDetails ?? {},
      },
    });
  }

  /**
   * Retrieve relevant past patterns for a given target metric.
   * Useful for informing new experiment hypotheses.
   */
  static async retrieve(projectId: string, metricKey: string) {
    return prisma.optimizationMemory.findMany({
      where: {
        projectId,
        OR: [
          { patternKey:    { contains: metricKey } },
          { metricImpacted: metricKey },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  /**
   * Summarize the project's optimization history:
   * total patterns, success rate, top improved metrics.
   */
  static async summarize(projectId: string) {
    const all = await prisma.optimizationMemory.findMany({ where: { projectId } });

    const total    = all.length;
    const successes = all.filter((m) => m.outcomeType === 'SUCCESS').length;
    const failures  = all.filter((m) => m.outcomeType === 'FAILURE').length;
    const partial   = all.filter((m) => m.outcomeType === 'PARTIAL').length;

    const topMetrics = [...new Set(all.map((m) => m.metricImpacted))].slice(0, 5);

    const avgDelta = all.reduce((acc, m) => acc + (m.deltaAchieved ?? 0), 0) / Math.max(total, 1);

    return {
      total,
      successes,
      failures,
      partial,
      successRate: total > 0 ? (successes / total) * 100 : 0,
      averageDeltaAchieved: avgDelta,
      topImpactedMetrics: topMetrics,
    };
  }

  /**
   * Get all memory entries for a project.
   */
  static async list(projectId: string) {
    return prisma.optimizationMemory.findMany({
      where:   { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
