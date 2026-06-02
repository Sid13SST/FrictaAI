import { prisma } from '@fricta/db';

export class SuccessCatalogManager {
  static async syncSuccessPatterns(projectId: string) {
    const logs: string[] = [];

    // Find positive outcomes with verified initiative impacts
    const outcomes = await prisma.productOutcome.findMany({
      where: { projectId, verdict: 'POSITIVE' },
      include: { impacts: true }
    });

    for (const out of outcomes) {
      for (const imp of out.impacts) {
        if (imp.deltaPercent > 5.0) {
          const title = `Successful KPI lift: ${out.title}`;
          const existing = await prisma.successPattern.findFirst({
            where: { projectId, title }
          });

          if (!existing) {
            const pattern = await prisma.successPattern.create({
              data: {
                projectId,
                title,
                description: `Initiative impact yielded a positive delta of ${imp.deltaPercent.toFixed(1)}% on target KPI. Contribution details: ${imp.contributionAnalysis}`,
                winCategory: 'CONVERSION',
                impactScore: imp.deltaPercent
              }
            });

            // Also catalog as an organizational lesson
            await prisma.organizationalLesson.create({
              data: {
                projectId,
                title: `Win: ${pattern.title}`,
                summary: pattern.description,
                lessonType: 'WIN',
                impactScore: pattern.impactScore,
                evidence: JSON.parse(JSON.stringify({ outcomeId: out.id, impactId: imp.id }))
              }
            }).catch(() => {});

            logs.push(`Added success pattern: "${title}"`);
          }
        }
      }
    }

    return logs;
  }
}
