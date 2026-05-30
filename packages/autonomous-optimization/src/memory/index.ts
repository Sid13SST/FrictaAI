import { prisma } from '@fricta/db';

export class MemoryManager {
  /**
   * Records forecast accuracy evaluation.
   */
  static async recordAccuracy(forecastId: string, actualValue: number) {
    const forecast = await prisma.optimizationForecast.findUnique({
      where: { id: forecastId }
    });
    if (!forecast) throw new Error('Forecast not found');

    const expected = forecast.forecastedValue;
    const errorPercent = expected !== 0 ? Math.abs((actualValue - expected) / expected) * 100 : 0;

    const record = await prisma.forecastAccuracyRecord.create({
      data: {
        forecastId,
        actualValue,
        errorPercent,
      }
    });

    return record;
  }
}
