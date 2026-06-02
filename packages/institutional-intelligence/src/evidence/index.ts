import { prisma } from '@fricta/db';

export class WisdomEvidenceResolver {
  static async resolveEvidenceForLesson(projectId: string, lessonId: string) {
    const evidences = await prisma.wisdomEvidence.findMany({
      where: { projectId, lessonId }
    });

    const resolved = [];

    for (const ev of evidences) {
      let linkedData: any = null;

      try {
        if (ev.evidenceType === 'HISTORICAL_CASE') {
          linkedData = await prisma.historicalCase.findUnique({
            where: { id: ev.referenceId }
          });
        } else if (ev.evidenceType === 'OUTCOME_VERDICT') {
          linkedData = await prisma.productOutcome.findUnique({
            where: { id: ev.referenceId }
          });
        } else if (ev.evidenceType === 'KPI_TREND') {
          linkedData = await prisma.productKPI.findUnique({
            where: { id: ev.referenceId }
          });
        } else if (ev.evidenceType === 'TELEMETRY_REPLAY') {
          linkedData = await prisma.workflowSession.findUnique({
            where: { id: ev.referenceId }
          });
        }
      } catch (err) {
        console.error(`Error resolving wisdom evidence reference ${ev.evidenceType} ID ${ev.referenceId}:`, err);
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
    lessonId: string,
    type: 'HISTORICAL_CASE' | 'OUTCOME_VERDICT' | 'KPI_TREND' | 'TELEMETRY_REPLAY',
    referenceId: string,
    description: string
  ) {
    return prisma.wisdomEvidence.create({
      data: {
        projectId,
        lessonId,
        evidenceType: type,
        referenceId,
        description
      }
    });
  }
}
