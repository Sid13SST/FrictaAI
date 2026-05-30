import { prisma } from '@fricta/db';
import type { ExperimentCandidate, VariantDefinition } from '../types';

// ─── Experiment Manager ───────────────────────────────────────────────────────
// Creates, activates, and concludes structured UX experiments.
// All status transitions are explicit and logged.

export class ExperimentManager {
  /**
   * Create a new UX experiment in DRAFT status with optional variants.
   */
  static async createExperiment(
    candidate: ExperimentCandidate,
    variants?: VariantDefinition[]
  ) {
    const experiment = await prisma.uXExperiment.create({
      data: {
        projectId:       candidate.projectId,
        name:            candidate.name,
        description:     candidate.description,
        targetMetric:    candidate.targetMetric,
        targetWorkflow:  candidate.targetWorkflow,
        evaluationWindow: candidate.evaluationWindowDays ?? 14,
        status:          'DRAFT',
      },
    });

    if (variants && variants.length > 0) {
      await prisma.experimentVariant.createMany({
        data: variants.map((v) => ({
          experimentId: experiment.id,
          name:         v.name,
          isControl:    v.isControl,
          description:  v.description,
          changeType:   v.changeType,
          changeDetails: v.changeDetails,
        })),
      });
    }

    return experiment;
  }

  /**
   * Activate a DRAFT experiment — sets status to ACTIVE and records startedAt.
   */
  static async activateExperiment(experimentId: string) {
    return prisma.uXExperiment.update({
      where: { id: experimentId },
      data:  { status: 'ACTIVE', startedAt: new Date() },
    });
  }

  /**
   * Conclude an experiment — transitions to COMPLETED and records concludedAt.
   */
  static async concludeExperiment(experimentId: string) {
    return prisma.uXExperiment.update({
      where: { id: experimentId },
      data:  { status: 'COMPLETED', concludedAt: new Date() },
    });
  }

  /**
   * Get all experiments for a project, ordered by creation date.
   */
  static async listExperiments(projectId: string) {
    return prisma.uXExperiment.findMany({
      where:   { projectId },
      include: { hypothesis: true, variants: true, outcomes: true, baselines: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single experiment with all relations.
   */
  static async getExperiment(experimentId: string) {
    return prisma.uXExperiment.findUnique({
      where:   { id: experimentId },
      include: {
        hypothesis: true,
        variants:   true,
        outcomes:   true,
        evidence:   true,
        baselines:  true,
      },
    });
  }
}
