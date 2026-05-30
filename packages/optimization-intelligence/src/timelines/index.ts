import { prisma } from '@fricta/db';
import type { TimelineEvent } from '../types';

// ─── Experiment Timeline ──────────────────────────────────────────────────────
// Reconstructs the full lifecycle of an experiment as a chronological event log.

export class ExperimentTimeline {
  /**
   * Get a full lifecycle event timeline for an experiment.
   * Assembles events from creation, activation, outcomes, and evidence.
   */
  static async getTimeline(experimentId: string): Promise<TimelineEvent[]> {
    const experiment = await prisma.uXExperiment.findUnique({
      where:   { id: experimentId },
      include: { outcomes: true, evidence: true, hypothesis: true, variants: true },
    });

    if (!experiment) return [];

    const events: TimelineEvent[] = [];

    // Creation
    events.push({
      timestamp: experiment.createdAt,
      event:     'EXPERIMENT_CREATED',
      details:   { name: experiment.name, status: 'DRAFT', targetMetric: experiment.targetMetric },
    });

    // Hypothesis
    if (experiment.hypothesis) {
      events.push({
        timestamp: experiment.hypothesis.createdAt,
        event:     'HYPOTHESIS_BUILT',
        details:   {
          problemStatement: experiment.hypothesis.problemStatement,
          expectedImprovement: experiment.hypothesis.expectedImprovement,
          risk: experiment.hypothesis.riskAssessment,
        },
      });
    }

    // Variant definitions
    for (const variant of experiment.variants) {
      events.push({
        timestamp: variant.createdAt,
        event:     'VARIANT_DEFINED',
        details:   { name: variant.name, isControl: variant.isControl, changeType: variant.changeType },
      });
    }

    // Evidence additions
    for (const ev of experiment.evidence) {
      events.push({
        timestamp: ev.addedAt,
        event:     'EVIDENCE_ADDED',
        details:   { evidenceType: ev.evidenceType, referenceId: ev.referenceId },
      });
    }

    // Activation
    if (experiment.startedAt) {
      events.push({
        timestamp: experiment.startedAt,
        event:     'EXPERIMENT_ACTIVATED',
        details:   { status: 'ACTIVE' },
      });
    }

    // Outcomes
    for (const outcome of experiment.outcomes) {
      events.push({
        timestamp: outcome.evaluatedAt,
        event:     'OUTCOME_RECORDED',
        details:   {
          conclusion:      outcome.conclusion,
          confidenceScore: outcome.confidenceScore,
          deltaPercent:    outcome.deltaPercent,
        },
      });
    }

    // Conclusion
    if (experiment.concludedAt) {
      events.push({
        timestamp: experiment.concludedAt,
        event:     'EXPERIMENT_CONCLUDED',
        details:   { status: experiment.status },
      });
    }

    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}
