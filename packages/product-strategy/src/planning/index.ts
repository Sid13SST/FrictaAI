import { prisma } from '@fricta/db';
import { StrategicPrioritizer } from '../priorities';

export class CapacityPlanner {
  /**
   * Recommends quarterly initiative sequences based on priority scores and maximum effort points limit per quarter.
   * E.g. default limit = 20 effort points per quarter.
   */
  static async recommendSequencing(projectId: string, maxEffortPointsPerQuarter: number = 20) {
    const initiatives = await prisma.productInitiative.findMany({
      where: { projectId, status: { in: ['PROPOSED', 'UNDER_REVIEW', 'PLANNING'] } },
      include: { evidence: true }
    });

    // Score and sort descending
    const sorted = initiatives.map(init => {
      const pInfo = StrategicPrioritizer.calculateInitiativePriority(
        {
          complexity: init.complexity,
          effortScore: init.effortScore,
          objectiveId: init.objectiveId
        },
        init.evidence
      );
      return {
        ...init,
        priorityScore: pInfo.overallScore,
        effort: pInfo.effort
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);

    const quarters = ['2026-Q3', '2026-Q4', '2027-Q1'];
    const plan: Record<string, any[]> = {
      '2026-Q3': [],
      '2026-Q4': [],
      '2027-Q1': []
    };

    const capacity: Record<string, number> = {
      '2026-Q3': 0,
      '2026-Q4': 0,
      '2027-Q1': 0
    };

    // Bin pack based on effort points
    for (const init of sorted) {
      let scheduled = false;
      for (const q of quarters) {
        if (capacity[q] + init.effort <= maxEffortPointsPerQuarter) {
          plan[q].push(init);
          capacity[q] += init.effort;
          scheduled = true;
          break;
        }
      }
      // Overflow to Q1 if no capacity fits
      if (!scheduled) {
        plan['2027-Q1'].push(init);
        capacity['2027-Q1'] += init.effort;
      }
    }

    return {
      plan,
      capacity
    };
  }
}
