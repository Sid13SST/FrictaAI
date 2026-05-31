import { prisma } from '@fricta/db';

export class StrategicPrioritizer {
  /**
   * Deterministically calculates a RICE-based priority score for an optimization opportunity.
   * RICE = (Reach * Impact * Confidence) / Effort * 100
   * Strategic alignment with Objectives adds a boost of up to 30%.
   */
  static calculateOpportunityRICE(op: {
    userReach: number;
    impactPotential: number;
    confidence: number;
    implementationComplexity: string;
  }, alignmentBoostPercent: number = 0): number {
    const reach = op.userReach;
    const impact = op.impactPotential;
    const confidence = op.confidence;

    let effort = 2; // MEDIUM
    if (op.implementationComplexity === 'LOW') effort = 1;
    if (op.implementationComplexity === 'HIGH') effort = 3;
    if (op.implementationComplexity === 'VERY_HIGH') effort = 4;

    let baseScore = ((reach * impact * confidence) / effort) * 100;
    
    // Apply strategic alignment boost
    if (alignmentBoostPercent > 0) {
      const boostVal = Math.min(alignmentBoostPercent, 30) / 100;
      baseScore = baseScore * (1 + boostVal);
    }

    return parseFloat(baseScore.toFixed(2));
  }

  /**
   * Computes an evidence-driven priority score for a Product Initiative.
   * PMs must be able to see exactly why an initiative is ranked highly.
   * Priority Score = (UserImpactScore * StrategicAlignmentScore * ConfidenceScore) / EffortScore
   */
  static calculateInitiativePriority(init: {
    complexity: string;
    effortScore: number; // 1 to 10 points
    objectiveId?: string | null;
  }, evidenceList: { evidenceType: string }[]): {
    overallScore: number;
    userImpact: number;
    strategicAlignment: number;
    confidence: number;
    effort: number;
    survivabilityScore: number;
  } {
    // 1. User Impact is derived from linked UX evidence counts
    // Anomaly = +5, Replay = +8, Investigation = +10, Signal = +3
    let baseImpact = 10;
    let baseSurvivability = 20; // baseline
    for (const ev of evidenceList) {
      if (ev.evidenceType === 'ANOMALY') {
        baseImpact += 5;
        baseSurvivability += 8;
      }
      else if (ev.evidenceType === 'REPLAY') {
        baseImpact += 8;
      }
      else if (ev.evidenceType === 'INVESTIGATION') {
        baseImpact += 12;
        baseSurvivability += 15;
      }
      else if (ev.evidenceType === 'SIGNAL') {
        baseImpact += 4;
        baseSurvivability += 5;
      }
      else {
        baseImpact += 3;
      }
    }
    const userImpact = Math.min(baseImpact, 100);
    const survivabilityScore = Math.min(baseSurvivability, 100);

    // 2. Strategic Alignment is 30% if linked to an objective, + 20% if there is ample evidence
    let strategicAlignment = init.objectiveId ? 50 : 10;
    if (evidenceList.length > 5) strategicAlignment += 20;
    strategicAlignment = Math.min(strategicAlignment, 100);

    // 3. Confidence is proportional to number of trace points (more traces = higher confidence)
    let confidence = 40; // baseline
    confidence += Math.min(evidenceList.length * 8, 50); // max +50% from evidence
    if (init.objectiveId) confidence += 10; // objectives are verified targets
    confidence = Math.min(confidence, 100);

    // 4. Effort Score is derived from PM 1-10 points (defaulting to complexity-based score if points are unconfigured)
    let effort = init.effortScore || 2;
    if (!init.effortScore) {
      if (init.complexity === 'LOW') effort = 2;
      else if (init.complexity === 'MEDIUM') effort = 5;
      else if (init.complexity === 'HIGH') effort = 8;
      else if (init.complexity === 'VERY_HIGH') effort = 10;
    }

    // Compute Overall Score: (UserImpact * StrategicAlignment * Confidence) / Effort / 100
    // Scales to a readable 0-100 score
    const scoreVal = ((userImpact * strategicAlignment * (confidence / 100)) / (effort || 1));
    
    return {
      overallScore: parseFloat(scoreVal.toFixed(2)),
      userImpact,
      strategicAlignment,
      confidence,
      effort,
      survivabilityScore
    };
  }

  /**
   * Evaluates and updates the strategic priorities for a project.
   */
  static async evaluateProjectPriorities(projectId: string) {
    const opportunities = await prisma.optimizationOpportunity.findMany({
      where: { projectId }
    });

    const scores = [];
    for (const op of opportunities) {
      const calculatedScore = this.calculateOpportunityRICE({
        userReach: op.userReach,
        impactPotential: op.impactPotential,
        confidence: op.confidence,
        implementationComplexity: op.implementationComplexity
      });

      // Update opportunity score table
      const scoreRecord = await prisma.opportunityScore.create({
        data: {
          projectId,
          opportunityId: op.id,
          title: op.title,
          reachScore: op.userReach * 100,
          impactScore: op.impactPotential * 100,
          confidenceScore: op.confidence * 100,
          effortScore: op.implementationComplexity === 'LOW' ? 10 : op.implementationComplexity === 'HIGH' ? 30 : 20,
          overallScore: calculatedScore
        }
      });
      scores.push(scoreRecord);
    }
    return scores;
  }
}
