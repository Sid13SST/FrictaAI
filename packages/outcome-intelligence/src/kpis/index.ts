import { prisma } from '@fricta/db';
import { KPIConfig, OutcomeBaselineConfig } from '../types';

export class KPIManager {
  static async createKPI(projectId: string, config: KPIConfig) {
    const kpi = await prisma.productKPI.create({
      data: {
        projectId,
        name: config.name,
        description: config.description,
        kpiType: config.kpiType,
        metricKey: config.metricKey,
        currentValue: 0.0,
        targetValue: config.targetValue ?? null,
        owner: config.owner ?? null,
        status: 'ACTIVE'
      }
    });

    // Create a timeline log event for the creation
    const firstUser = await prisma.user.findFirst();
    if (firstUser) {
      await prisma.activityEvent.create({
        data: {
          userId: firstUser.id,
          projectId,
          actionType: 'STRATEGY_KPI_CREATE',
          description: `Created product KPI: ${kpi.name} [${kpi.kpiType}]`
        }
      }).catch(() => {});
    }

    return kpi;
  }

  static async addHistory(kpiId: string, value: number) {
    const history = await prisma.kPIHistory.create({
      data: {
        kpiId,
        value
      }
    });

    await prisma.productKPI.update({
      where: { id: kpiId },
      data: { currentValue: value }
    });

    return history;
  }

  static async recordBaseline(kpiId: string, config: OutcomeBaselineConfig) {
    return prisma.outcomeBaseline.create({
      data: {
        kpiId,
        value: config.value,
        windowStart: config.windowStart,
        windowEnd: config.windowEnd
      }
    });
  }

  static async getKPIs(projectId: string) {
    return prisma.productKPI.findMany({
      where: { projectId },
      include: {
        histories: { orderBy: { recordedAt: 'desc' } },
        forecasts: { orderBy: { createdAt: 'desc' } },
        baselines: { orderBy: { createdAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
