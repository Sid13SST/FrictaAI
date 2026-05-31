import { prisma } from '@fricta/db';

export class OutcomeForecaster {
  static async createForecast(
    kpiId: string,
    projectedValue: number,
    confidenceLower: number,
    confidenceUpper: number,
    targetQuarter: string
  ) {
    return prisma.kPIForecast.create({
      data: {
        kpiId,
        projectedValue,
        confidenceLower,
        confidenceUpper,
        targetQuarter
      }
    });
  }

  static async getForecasts(projectId: string) {
    return prisma.kPIForecast.findMany({
      where: {
        kpi: { projectId }
      },
      include: {
        kpi: true
      },
      orderBy: { targetQuarter: 'asc' }
    });
  }
}
