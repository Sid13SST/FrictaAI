import { prisma } from '@fricta/db';

export class RecurrenceTracker {
  static async recordRecurrence(
    projectId: string,
    patternId: string,
    entityType: 'REPLAY' | 'UX_ANOMALY' | 'PRODUCT_KPI' | 'OUTCOME' | 'RISK',
    referenceId: string,
    details: string
  ) {
    // Check if the recurrence record already exists to prevent duplicate logs
    const existing = await prisma.recurrenceRecord.findFirst({
      where: { projectId, patternId, entityType, referenceId }
    });

    if (existing) {
      return existing;
    }

    const record = await prisma.recurrenceRecord.create({
      data: {
        projectId,
        patternId,
        entityType,
        referenceId,
        details
      }
    });

    // Increment occurrences in the main LearningPattern model
    await prisma.learningPattern.update({
      where: { id: patternId },
      data: {
        occurrences: {
          increment: 1
        }
      }
    });

    return record;
  }

  static async getRecurrenceDetails(projectId: string, patternId: string) {
    const records = await prisma.recurrenceRecord.findMany({
      where: { projectId, patternId },
      orderBy: { timestamp: 'desc' }
    });

    const countsByType = records.reduce((acc, curr) => {
      acc[curr.entityType] = (acc[curr.entityType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      records,
      countsByType,
      totalCount: records.length
    };
  }
}
