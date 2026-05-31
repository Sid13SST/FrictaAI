import { prisma } from '@fricta/db';

export class PortfolioManager {
  /**
   * Summarizes active initiatives grouped by owner, status, and strategic objective.
   */
  static async getPortfolioBreakdown(projectId: string) {
    const [initiatives, objectives] = await Promise.all([
      prisma.productInitiative.findMany({
        where: { projectId },
        include: { objective: true, evidence: true }
      }),
      prisma.strategicObjective.findMany({
        where: { projectId }
      })
    ]);

    // Group by owner
    const byOwner: Record<string, any[]> = {};
    // Group by status
    const byStatus: Record<string, any[]> = {};
    // Group by objective
    const byObjective: Record<string, any[]> = {};

    for (const init of initiatives) {
      const ownerKey = init.owner || 'unassigned';
      if (!byOwner[ownerKey]) byOwner[ownerKey] = [];
      byOwner[ownerKey].push(init);

      const statusKey = init.status;
      if (!byStatus[statusKey]) byStatus[statusKey] = [];
      byStatus[statusKey].push(init);

      const objKey = init.objectiveId ? init.objectiveId : 'unaligned';
      if (!byObjective[objKey]) byObjective[objKey] = [];
      byObjective[objKey].push(init);
    }

    // Map objective detail objects
    const objectiveBreakdown = objectives.map(obj => ({
      objective: obj,
      initiativesCount: byObjective[obj.id]?.length || 0,
      initiatives: byObjective[obj.id] || []
    }));

    return {
      totalInitiatives: initiatives.length,
      byOwner,
      byStatus,
      objectiveBreakdown,
      unalignedInitiatives: byObjective['unaligned'] || []
    };
  }
}
