import { prisma } from '@fricta/db';
import type { EvaluationResult, OutcomeConclusion } from '../types';

// ─── Outcome Recorder ─────────────────────────────────────────────────────────
// Persists experiment outcomes with classification and confidence scoring.
// All outcomes are immutable once written — audit-safe.

export class OutcomeRecorder {
  /**
   * Persist an evaluated outcome for an experiment.
   */
  static async record(
    projectId:    string,
    experimentId: string,
    result:       EvaluationResult
  ) {
    return prisma.experimentOutcome.create({
      data: {
        projectId,
        experimentId,
        conclusion:           result.conclusion,
        confidenceScore:      result.confidenceScore,
        baselineMetricValue:  result.baselineValue,
        outcomeMetricValue:   result.outcomeValue,
        deltaPercent:         result.deltaPercent,
        unexpectedEffects:    result.unexpectedEffects,
        evaluationNotes:      result.notes,
        evaluatedAt:          new Date(),
      },
    });
  }

  /**
   * Classify an outcome based on delta and threshold.
   * Deterministic — no ambiguity.
   */
  static classify(deltaPercent: number, successThreshold = 5): OutcomeConclusion {
    if (deltaPercent >= successThreshold)       return 'IMPROVED';
    if (deltaPercent <= -successThreshold)      return 'REGRESSED';
    if (Math.abs(deltaPercent) < 1)             return 'NEUTRAL';
    return 'INCONCLUSIVE';
  }

  /**
   * Get all outcomes for a project.
   */
  static async listOutcomes(projectId: string) {
    return prisma.experimentOutcome.findMany({
      where:   { projectId },
      include: { experiment: true },
      orderBy: { evaluatedAt: 'desc' },
    });
  }

  /**
   * Get the most recent outcome for a specific experiment.
   */
  static async getLatestOutcome(experimentId: string) {
    return prisma.experimentOutcome.findFirst({
      where:   { experimentId },
      orderBy: { evaluatedAt: 'desc' },
    });
  }
}
