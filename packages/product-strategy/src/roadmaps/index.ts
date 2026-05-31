import { prisma } from '@fricta/db';
import { StrategicPrioritizer } from '../priorities';

export class RoadmapGenerator {
  /**
   * Generates a quarterly roadmap proposal for human review.
   * Sequences initiatives based on Priority Score, Complexity, and Dependency Mapping.
   * - High Priority, Low/Medium Complexity -> Next Quarter (Q3)
   * - Medium Priority or High Complexity -> Next+1 Quarter (Q4)
   * - Low Priority or Very High Complexity -> Next+2 Quarter (Q1)
   */
  static async generateRoadmapProposal(projectId: string) {
    // 1. Fetch initiatives with their linked evidence and strategic risks
    const initiatives = await prisma.productInitiative.findMany({
      where: { projectId },
      include: {
        evidence: true,
        risks: true
      }
    });

    // 2. Compute strategic priority scores dynamically
    const scoredInitiatives = initiatives.map(init => {
      const priorityInfo = StrategicPrioritizer.calculateInitiativePriority(
        {
          complexity: init.complexity,
          effortScore: init.effortScore,
          objectiveId: init.objectiveId
        },
        init.evidence
      );

      return {
        ...init,
        priorityScore: priorityInfo.overallScore,
        details: priorityInfo
      };
    });

    // Sort by priority score desc
    scoredInitiatives.sort((a, b) => b.priorityScore - a.priorityScore);

    // 3. Sequential Scheduling Setup
    const q3 = '2026-Q3';
    const q4 = '2026-Q4';
    const q1 = '2027-Q1';

    const quarters = [q3, q4, q1];
    
    // Ensure default roadmaps exist
    const roadmaps = await Promise.all(
      quarters.map(async q => {
        let rm = await prisma.productRoadmap.findFirst({
          where: { projectId, quarter: q }
        });
        if (!rm) {
          rm = await prisma.productRoadmap.create({
            data: {
              projectId,
              quarter: q,
              title: `${q} Product Roadmap`,
              description: `Evidence-driven product initiatives scheduled for ${q}`,
              status: 'DRAFT'
            }
          });
        }
        return rm;
      })
    );

    // 4. Initial Sequencing
    const scheduled: Record<string, string> = {}; // initId -> quarter
    for (const init of scoredInitiatives) {
      let targetQuarter = q3;
      if (init.complexity === 'VERY_HIGH' || init.priorityScore < 15) {
        targetQuarter = q1;
      } else if (init.complexity === 'HIGH' || init.priorityScore < 40) {
        targetQuarter = q4;
      }
      scheduled[init.id] = targetQuarter;
    }

    // 5. Dependency Mapping & Resolution
    // Parse risks for dependencies. E.g. description contains "Requires initiative: [id]"
    for (const init of scoredInitiatives) {
      const depRisks = init.risks.filter(r => r.riskType === 'DEPENDENCY');
      for (const risk of depRisks) {
        // Extract dependency ID from mitigation plan or description (look for UUID string)
        const match = risk.description.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        if (match) {
          const dependencyId = match[0];
          const dependencyQuarter = scheduled[dependencyId];
          const currentQuarter = scheduled[init.id];

          if (dependencyQuarter && currentQuarter) {
            // Prerequisite must be scheduled in same or earlier quarter
            const currentIdx = quarters.indexOf(currentQuarter);
            const depIdx = quarters.indexOf(dependencyQuarter);
            if (currentIdx < depIdx) {
              // Push the dependent initiative to the dependency's quarter or later
              scheduled[init.id] = dependencyQuarter;
            }
          }
        }
      }
    }

    // 6. Update database records
    for (const init of scoredInitiatives) {
      const targetQuarter = scheduled[init.id];
      const matchedRoadmap = roadmaps.find(r => r.quarter === targetQuarter);
      if (matchedRoadmap) {
        await prisma.productInitiative.update({
          where: { id: init.id },
          data: {
            roadmapId: matchedRoadmap.id,
            targetQuarter,
            strategicScore: init.priorityScore,
            userImpactScore: init.details.userImpact,
            survivabilityScore: init.details.survivabilityScore,
            riskScore: init.details.confidence // maps confidence to database
          }
        });
      }
    }

    return roadmaps;
  }
}
