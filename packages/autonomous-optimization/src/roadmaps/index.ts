import { prisma } from '@fricta/db';

export class RoadmapManager {
  /**
   * Sequence a list of recommendations/initiatives into a quarterly roadmap.
   * High priority, low complexity -> Q3.
   * Medium priority or medium complexity -> Q4.
   * Low priority or high complexity -> Q1.
   */
  static async buildRoadmapProposal(projectId: string, initiativeIds: string[]) {
    // 1. Fetch initiatives
    const initiatives = await prisma.initiativeRecommendation.findMany({
      where: { id: { in: initiativeIds }, projectId }
    });

    // 2. Group into quarters
    const currentQuarter = '2026-Q3';
    const nextQuarter = '2026-Q4';
    const futureQuarter = '2027-Q1';

    // Create default roadmaps if not exist
    const quarters = [currentQuarter, nextQuarter, futureQuarter];
    const roadmaps = await Promise.all(
      quarters.map(async q => {
        let rm = await prisma.optimizationRoadmap.findFirst({
          where: { projectId, quarter: q }
        });
        if (!rm) {
          rm = await prisma.optimizationRoadmap.create({
            data: {
              projectId,
              quarter: q,
              title: `${q} UX Optimization Roadmap`,
              description: `Prioritized initiatives scheduled for execution in ${q}`,
              status: 'DRAFT'
            }
          });
        }
        return rm;
      })
    );

    // 3. Update initiatives with roadmap ID
    for (const init of initiatives) {
      let targetQuarter = currentQuarter;
      if (init.complexity === 'HIGH' || init.score < 20) {
        targetQuarter = futureQuarter;
      } else if (init.complexity === 'MEDIUM' || init.score < 40) {
        targetQuarter = nextQuarter;
      }

      const matchedRoadmap = roadmaps.find((r: any) => r.quarter === targetQuarter);
      if (matchedRoadmap) {
        await prisma.initiativeRecommendation.update({
          where: { id: init.id },
          data: { roadmapId: matchedRoadmap.id }
        });
      }
    }

    return roadmaps;
  }
}
