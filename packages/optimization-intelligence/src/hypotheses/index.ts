import { prisma } from '@fricta/db';
import type { HypothesisCandidate } from '../types';

// ─── Hypothesis Engine ────────────────────────────────────────────────────────
// Builds structured, evidence-backed hypotheses for UX experiments.
// A hypothesis must be complete before an experiment can be activated.

export class HypothesisEngine {
  /**
   * Build and persist a structured hypothesis from evidence.
   */
  static async buildHypothesis(candidate: HypothesisCandidate) {
    return prisma.optimizationHypothesis.create({
      data: {
        projectId:          candidate.projectId,
        experimentId:       candidate.experimentId,
        problemStatement:   candidate.problemStatement,
        supportingEvidence: JSON.stringify(candidate.supportingEvidence),
        expectedImprovement: candidate.expectedImprovement,
        measurementStrategy: candidate.measurementStrategy,
        riskAssessment:      candidate.riskAssessment,
        evaluationWindow:    candidate.evaluationWindowDays ?? 14,
        successThreshold:    candidate.successThreshold ?? 0.05,
      },
    });
  }

  /**
   * Validate a hypothesis has all required fields populated.
   * Returns an array of missing field names, empty if valid.
   */
  static async validateHypothesis(hypothesisId: string): Promise<string[]> {
    const h = await prisma.optimizationHypothesis.findUnique({ where: { id: hypothesisId } });
    if (!h) return ['hypothesis_not_found'];

    const missing: string[] = [];
    if (!h.problemStatement)   missing.push('problemStatement');
    if (!h.supportingEvidence) missing.push('supportingEvidence');
    if (!h.expectedImprovement) missing.push('expectedImprovement');
    if (!h.measurementStrategy) missing.push('measurementStrategy');
    if (!h.riskAssessment)     missing.push('riskAssessment');

    return missing;
  }

  /**
   * Link an existing hypothesis to an experiment.
   */
  static async linkToExperiment(hypothesisId: string, experimentId: string) {
    return prisma.optimizationHypothesis.update({
      where: { id: hypothesisId },
      data:  { experimentId },
    });
  }

  /**
   * List all hypotheses for a project.
   */
  static async listHypotheses(projectId: string) {
    return prisma.optimizationHypothesis.findMany({
      where:   { projectId },
      include: { experiment: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
