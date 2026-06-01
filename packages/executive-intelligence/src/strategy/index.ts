import { prisma } from '@fricta/db';

export class StrategyOptimizer {
  static async optimizeSequencing(projectId: string) {
    const initiatives = await prisma.productInitiative.findMany({
      where: { projectId },
      orderBy: { strategicScore: 'desc' }
    });

    const lowComplexityCount = initiatives.filter(i => i.complexity === 'LOW').length;
    const medComplexityCount = initiatives.filter(i => i.complexity === 'MEDIUM').length;
    const highComplexityCount = initiatives.filter(i => i.complexity === 'HIGH').length;

    const totalCapacityPoints = initiatives.reduce((sum, i) => sum + (i.effortScore ?? 0), 0);

    return {
      totalInitiativesAnalyzed: initiatives.length,
      capacityDistribution: {
        LOW: lowComplexityCount,
        MEDIUM: medComplexityCount,
        HIGH: highComplexityCount
      },
      totalCapacityPoints,
      averageStrategicScore: initiatives.length > 0 
        ? initiatives.reduce((sum, i) => sum + (i.strategicScore ?? 0), 0) / initiatives.length
        : 75.0
    };
  }
}
