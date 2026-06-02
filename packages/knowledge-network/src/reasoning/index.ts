import { prisma } from '@fricta/db';

export class ReasoningEngine {
  static async evaluateStrategicAlignment(projectId: string) {
    const objectivesCount = await prisma.strategicObjective.count({ where: { projectId } });
    const initiativesCount = await prisma.productInitiative.count({ where: { projectId } });

    const alignedInitiatives = await prisma.productInitiative.count({
      where: { projectId, NOT: { objectiveId: null } }
    });

    const unalignedCount = initiativesCount - alignedInitiatives;
    const alignmentRate = initiativesCount > 0 ? (alignedInitiatives / initiativesCount) * 100.0 : 100.0;

    let details = 'Strong strategic alignment across active roadmap initiatives.';
    let status = 'PASSED';

    if (alignmentRate < 60.0) {
      status = 'FAILED';
      details = `Low strategic alignment: ${unalignedCount} initiatives lack mapped Strategic Objectives.`;
    } else if (alignmentRate < 80.0) {
      status = 'WARNING';
      details = `Partial strategic alignment: ${unalignedCount} initiatives lack mapped Strategic Objectives.`;
    }

    return {
      objectivesCount,
      initiativesCount,
      alignedInitiatives,
      alignmentRate,
      status,
      details
    };
  }
}
