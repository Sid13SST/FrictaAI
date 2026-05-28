import { prisma } from '@fricta/db';
import { SurvivabilityData } from '../types';

export class WorkflowSurvivabilityTracker {
  /**
   * Projects survivability trends from historical forecasting runs.
   */
  static async projectSurvivability(projectId: string, workspaceId: string | null): Promise<SurvivabilityData[]> {
    const forecasts = await prisma.workflowForecast.findMany({
      where: { projectId },
      include: {
        survivabilityForecasts: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    if (forecasts.length === 0) {
      return [];
    }

    const map = new Map<string, { steps: number; rateSum: number; count: number; triggers: string[] }>();

    for (const f of forecasts) {
      for (const s of f.survivabilityForecasts) {
        const existing = map.get(s.personaType) || { steps: 0, rateSum: 0, count: 0, triggers: [] };
        existing.steps += s.estimatedStepsToAbandon;
        existing.rateSum += s.predictedSurvivalRate;
        existing.count++;
        if (s.primaryAbandonmentTrigger && !existing.triggers.includes(s.primaryAbandonmentTrigger)) {
          existing.triggers.push(s.primaryAbandonmentTrigger);
        }
        map.set(s.personaType, existing);
      }
    }

    const result: SurvivabilityData[] = [];
    for (const [personaName, val] of map.entries()) {
      result.push({
        personaName,
        stepLimit: Math.round(val.steps / val.count),
        predictedSurvivalRate: Math.round((val.rateSum / val.count) * 10) / 10,
        exitTriggers: val.triggers.slice(0, 3)
      });
    }

    return result;
  }
}
