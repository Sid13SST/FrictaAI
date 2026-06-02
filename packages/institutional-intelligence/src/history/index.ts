import { prisma } from '@fricta/db';

export class HistoricalCaseSynthesizer {
  static async compileHistoricalStats(projectId: string) {
    const cases = await prisma.historicalCase.findMany({
      where: { projectId }
    });

    const successCount = cases.filter(c => c.caseType === 'SUCCESS').length;
    const failureCount = cases.filter(c => c.caseType === 'FAILURE').length;
    const totalCount = cases.length;

    const avgSuccessRate = totalCount > 0 
      ? cases.reduce((acc, c) => acc + (c.successRate || 0), 0) / totalCount
      : 0;

    return {
      totalCount,
      successCount,
      failureCount,
      avgSuccessRate,
      casesSummary: cases.map(c => ({
        id: c.id,
        title: c.title,
        caseType: c.caseType,
        successRate: c.successRate,
        description: c.description
      }))
    };
  }
}
