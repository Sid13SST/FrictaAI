import { prisma } from '@fricta/db';
import type { DecisionInput } from '../types';

export class RecommendationManager {
  /**
   * Apply a decision to an initiative recommendation under human gate constraints.
   */
  static async decide(
    recommendationId: string,
    decision: DecisionInput
  ) {
    // 1. Fetch recommendation
    const rec = await prisma.initiativeRecommendation.findUnique({
      where: { id: recommendationId }
    });
    if (!rec) throw new Error('Recommendation not found');

    // 2. Map actions to statuses
    let targetStatus = rec.status;
    if (decision.action === 'APPROVED') {
      targetStatus = 'APPROVED';
    } else if (decision.action === 'REJECTED') {
      targetStatus = 'REJECTED';
    } else if (decision.action === 'ARCHIVED') {
      targetStatus = 'ARCHIVED';
    } else if (decision.action === 'CONVERT_TO_EXPERIMENT') {
      targetStatus = 'CONVERTED_TO_EXPERIMENT';
      
      // Auto-generate experiment in draft mode
      await prisma.uXExperiment.create({
        data: {
          projectId: rec.projectId,
          name: `Experiment: ${rec.title}`,
          description: `Derived from optimization recommendation: ${rec.description}`,
          targetMetric: rec.impactArea.toLowerCase() === 'high_friction' ? 'rage_click_rate' : `${rec.impactArea.toLowerCase()}_survivability`,
          status: 'DRAFT',
          evaluationWindow: 14,
        }
      });
    } else if (decision.action === 'CONVERT_TO_INVESTIGATION') {
      targetStatus = 'CONVERTED_TO_INVESTIGATION';

      // Create an investigation thread
      await prisma.investigationThread.create({
        data: {
          projectId: rec.projectId,
          title: `Investigation: ${rec.title}`,
          status: 'ACTIVE'
        }
      });
    } else if (decision.action === 'CONVERT_TO_JIRA') {
      targetStatus = 'CONVERTED_TO_JIRA';
    }

    // 3. Create Decision Log
    const dbDecision = await prisma.recommendationDecision.create({
      data: {
        recommendationId,
        userId: decision.userId,
        action: decision.action,
        comments: decision.comments,
        externalReference: decision.externalReference,
      }
    });

    // 4. Update status
    const updatedRec = await prisma.initiativeRecommendation.update({
      where: { id: recommendationId },
      data: { status: targetStatus },
      include: { decisions: true }
    });

    return { recommendation: updatedRec, decision: dbDecision };
  }
}
