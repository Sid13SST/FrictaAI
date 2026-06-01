import { prisma } from '@fricta/db';

export class EvidenceResolver {
  static async resolveEvidenceTrail(projectId: string, recommendationId: string) {
    const evidenceList = await prisma.executiveEvidence.findMany({
      where: { recommendationId },
      orderBy: { createdAt: 'asc' }
    });

    const resolved = [];

    for (const ev of evidenceList) {
      let entityDetails: any = null;

      if (ev.evidenceType === 'UX_ANOMALY') {
        entityDetails = await prisma.uXAnomaly.findUnique({
          where: { id: ev.referenceId }
        }).catch(() => null);
      } else if (ev.evidenceType === 'REPLAY') {
        entityDetails = await prisma.workflowSession.findUnique({
          where: { id: ev.referenceId }
        }).catch(() => null);
      } else if (ev.evidenceType === 'INITIATIVE') {
        entityDetails = await prisma.productInitiative.findUnique({
          where: { id: ev.referenceId }
        }).catch(() => null);
      } else if (ev.evidenceType === 'KPI') {
        entityDetails = await prisma.productKPI.findUnique({
          where: { id: ev.referenceId }
        }).catch(() => null);
      } else if (ev.evidenceType === 'OUTCOME') {
        entityDetails = await prisma.productOutcome.findUnique({
          where: { id: ev.referenceId }
        }).catch(() => null);
      }

      resolved.push({
        evidenceId: ev.id,
        evidenceType: ev.evidenceType,
        referenceId: ev.referenceId,
        description: ev.description,
        entityDetails
      });
    }

    return resolved;
  }
}
