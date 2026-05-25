import { PrismaClient } from '@fricta/db';

export class HistoricalBaselineManager {
  constructor(private prisma: PrismaClient) {}

  public async getOrCreateBaseline(projectId: string, workflowPath: string, name: string = 'V1.0 System Baseline') {
    // Check if baseline already exists
    let baseline = await this.prisma.historicalBaseline.findFirst({
      where: { projectId, workflowPath, name },
    });

    if (baseline) {
      return baseline;
    }

    // Otherwise compile baseline from existing runs or seed mock defaults
    const paths = await this.prisma.explorationPath.findMany({
      where: {
        profile: { projectId }
      },
      include: {
        session: {
          include: {
            cognitiveStates: true
          }
        }
      }
    });

    let averageSteps = 4.2;
    let averageFriction = 0.32;
    let successRate = 0.85;
    let cognitiveLoadAverage = 0.38;
    let sampleSize = Math.max(3, paths.length);

    if (paths.length > 0) {
      const successes = paths.filter(p => p.isSuccess).length;
      successRate = successes / paths.length;
      averageSteps = paths.reduce((sum, p) => sum + (p.steps as any[]).length, 0) / paths.length;
      averageFriction = paths.reduce((sum, p) => sum + p.totalFrictionScore, 0) / paths.length;

      let cogSum = 0;
      let cogCount = 0;
      paths.forEach(p => {
        p.session?.cognitiveStates.forEach(c => {
          cogSum += c.cognitiveLoad;
          cogCount++;
        });
      });
      if (cogCount > 0) {
        cognitiveLoadAverage = cogSum / cogCount;
      }
    }

    baseline = await this.prisma.historicalBaseline.create({
      data: {
        projectId,
        name,
        workflowPath,
        averageSteps,
        averageFriction,
        successRate,
        cognitiveLoadAverage,
        sampleSize,
      },
    });

    return baseline;
  }
}
