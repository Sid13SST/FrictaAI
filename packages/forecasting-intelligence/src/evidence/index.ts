import { prisma } from '@fricta/db';

export class ForecastEvidenceLinker {
  static async resolveEvidenceForForecast(projectId: string, forecastId: string) {
    const evidences = await prisma.strategicForecastEvidence.findMany({
      where: { projectId, forecastId }
    });

    const resolved = [];

    for (const ev of evidences) {
      let linkedData: any = null;

      try {
        if (ev.evidenceType === 'HISTORICAL_PATTERN') {
          linkedData = await prisma.learningPattern.findUnique({
            where: { id: ev.referenceId }
          });
        } else if (ev.evidenceType === 'HISTORICAL_CASE') {
          linkedData = await prisma.historicalCase.findUnique({
            where: { id: ev.referenceId }
          });
        } else if (ev.evidenceType === 'OUTCOME_VERDICT') {
          linkedData = await prisma.productOutcome.findUnique({
            where: { id: ev.referenceId }
          });
        } else if (ev.evidenceType === 'TELEMETRY_REPLAY') {
          linkedData = await prisma.workflowSession.findUnique({
            where: { id: ev.referenceId }
          });
        }
      } catch (err) {
        console.error(`Error resolving evidence reference ${ev.evidenceType} ID ${ev.referenceId}:`, err);
      }

      resolved.push({
        id: ev.id,
        evidenceType: ev.evidenceType,
        referenceId: ev.referenceId,
        description: ev.description,
        createdAt: ev.createdAt,
        linkedData
      });
    }

    return resolved;
  }

  static async linkEvidence(
    projectId: string,
    forecastId: string,
    type: 'HISTORICAL_PATTERN' | 'HISTORICAL_CASE' | 'TELEMETRY_REPLAY' | 'OUTCOME_VERDICT',
    referenceId: string,
    description: string
  ) {
    return prisma.strategicForecastEvidence.create({
      data: {
        projectId,
        forecastId,
        evidenceType: type,
        referenceId,
        description
      }
    });
  }
}
