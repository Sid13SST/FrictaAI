import { prisma } from '@fricta/db';

export class AssumptionValidator {
  static async validateAssumptions(projectId: string) {
    const assumptions = await prisma.forecastAssumption.findMany({
      where: { projectId }
    });

    const logs: string[] = [];

    for (const asm of assumptions) {
      let validityStatus: 'VALID' | 'INVALID' | 'UNKNOWN' = 'UNKNOWN';

      // Deterministic validation rules:
      // If assumption statement mentions retention or conversion limits, check telemetry indicators
      if (asm.statement.toLowerCase().includes('retention') || asm.statement.toLowerCase().includes('completion')) {
        const completions = await prisma.workflowSession.findMany({
          where: { projectId, status: 'COMPLETED' }
        });
        const total = await prisma.workflowSession.count({ where: { projectId } });
        const rate = total > 0 ? completions.length / total : 0;

        if (rate > 0.65) {
          validityStatus = 'VALID';
        } else {
          validityStatus = 'INVALID';
        }
      } else if (asm.statement.toLowerCase().includes('kpi') || asm.statement.toLowerCase().includes('metric')) {
        // If KPI trends are improving, assumption is valid
        const kpis = await prisma.productKPI.findMany({
          where: { projectId }
        });
        const stable = kpis.every(k => k.currentValue >= (k.targetValue ?? 0) * 0.8);
        validityStatus = stable ? 'VALID' : 'INVALID';
      } else {
        validityStatus = 'VALID';
      }

      await prisma.forecastAssumption.update({
        where: { id: asm.id },
        data: { validityStatus }
      });

      logs.push(`Validated assumption "${asm.statement}": Status is now ${validityStatus}.`);
    }

    return logs;
  }

  static async createAssumption(
    projectId: string,
    forecastId: string,
    statement: string,
    impactLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  ) {
    return prisma.forecastAssumption.create({
      data: {
        projectId,
        forecastId,
        statement,
        validityStatus: 'UNKNOWN',
        impactLevel
      }
    });
  }
}
