import { prisma } from '@fricta/db';

export class AlignmentValidator {
  /**
   * Validates if a product initiative matches the strategic objectives of the project.
   */
  static async checkObjectiveAlignment(initiativeId: string): Promise<{
    aligned: boolean;
    alignmentScore: number;
    reasons: string[];
  }> {
    const init = await prisma.productInitiative.findUnique({
      where: { id: initiativeId },
      include: { objective: true }
    });

    if (!init) {
      return { aligned: false, alignmentScore: 0.0, reasons: ['Initiative not found.'] };
    }

    if (!init.objective) {
      return {
        aligned: false,
        alignmentScore: 10.0,
        reasons: ['No explicit Strategic Objective linked to this initiative.']
      };
    }

    const reasons: string[] = [];
    let score = 50.0; // base score for linking

    const objectiveTitle = init.objective.title.toLowerCase();
    const initiativeTitle = init.title.toLowerCase();
    const initiativeDesc = init.description.toLowerCase();

    // Check keyword intersections
    const keywords = ['checkout', 'onboarding', 'conversion', 'rage click', 'friction', 'speed', 'performance'];
    let matchesCount = 0;
    for (const kw of keywords) {
      if (objectiveTitle.includes(kw) && (initiativeTitle.includes(kw) || initiativeDesc.includes(kw))) {
        matchesCount++;
        reasons.push(`Linked via key area match: "${kw}"`);
      }
    }

    score += Math.min(matchesCount * 15, 40);

    // Metric compatibility checks
    if (init.objective.targetMetric) {
      const metric = init.objective.targetMetric.toLowerCase();
      if (initiativeTitle.includes(metric) || initiativeDesc.includes(metric)) {
        score += 10;
        reasons.push(`Compatible with target metric: "${init.objective.targetMetric}"`);
      }
    }

    if (score >= 70.0) {
      reasons.push('High semantic mapping verified by priorities logic.');
    } else {
      reasons.push('Linked objective is valid, but title/description details show low semantic overlap.');
    }

    return {
      aligned: score >= 50.0,
      alignmentScore: score,
      reasons
    };
  }
}
