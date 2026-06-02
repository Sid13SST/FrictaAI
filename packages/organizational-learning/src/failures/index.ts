import { prisma } from '@fricta/db';

export class FailureCatalogManager {
  static async syncFailurePatterns(projectId: string) {
    const logs: string[] = [];

    // 1. Identify failure patterns from negative strategic outcomes
    const outcomes = await prisma.productOutcome.findMany({
      where: { projectId, verdict: 'NEGATIVE' },
      include: { impacts: true }
    });

    for (const out of outcomes) {
      const title = `Strategic Degrade: ${out.title}`;
      const existing = await prisma.failurePattern.findFirst({
        where: { projectId, title }
      });

      if (!existing) {
        const pattern = await prisma.failurePattern.create({
          data: {
            projectId,
            title,
            description: `Evaluation resulted in a NEGATIVE outcome verdict. Details: ${out.description}`,
            mistakeType: 'CTA_ABANDONMENT',
            impactScore: out.impacts[0]?.deltaPercent ? Math.abs(out.impacts[0].deltaPercent) : 5.0
          }
        });

        await prisma.organizationalLesson.create({
          data: {
            projectId,
            title: `Mistake: ${pattern.title}`,
            summary: pattern.description,
            lessonType: 'MISTAKE',
            impactScore: pattern.impactScore,
            evidence: JSON.parse(JSON.stringify({ outcomeId: out.id }))
          }
        }).catch(() => {});

        logs.push(`Added negative outcome failure pattern: "${title}"`);
      }
    }

    // 2. Identify failure patterns from critical rage-click loops or anomalies
    const anomalies = await prisma.uXAnomaly.findMany({
      where: { projectId, severity: 'CRITICAL', isResolved: false }
    });

    for (const anom of anomalies) {
      const title = `Critical Friction: ${anom.description.substring(0, 40)}`;
      const existing = await prisma.failurePattern.findFirst({
        where: { projectId, title }
      });

      if (!existing) {
        const pattern = await prisma.failurePattern.create({
          data: {
            projectId,
            title,
            description: `Critical unresolved UX incident: "${anom.description}". Anomaly type: ${anom.anomalyType}`,
            mistakeType: 'RAGE_CLICK_LOOP',
            impactScore: 8.0
          }
        });

        await prisma.organizationalLesson.create({
          data: {
            projectId,
            title: `Mistake: ${pattern.title}`,
            summary: pattern.description,
            lessonType: 'MISTAKE',
            impactScore: pattern.impactScore,
            evidence: JSON.parse(JSON.stringify({ anomalyId: anom.id }))
          }
        }).catch(() => {});

        logs.push(`Added UX anomaly failure pattern: "${title}"`);
      }
    }

    return logs;
  }
}
