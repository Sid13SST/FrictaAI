import { prisma } from '@fricta/db';

export interface ResolvedEvidence {
  evidenceId: string;
  evidenceType: string;
  referenceId: string;
  description: string;
  entityDetails?: any;
}

export class EvidenceResolver {
  static async resolveEvidenceForPattern(projectId: string, patternId: string): Promise<ResolvedEvidence[]> {
    const links = await prisma.patternEvidence.findMany({
      where: { patternId }
    });

    const resolved: ResolvedEvidence[] = [];

    for (const link of links) {
      let entityDetails: any = null;

      try {
        if (link.evidenceType === 'KPI_HISTORICAL') {
          entityDetails = await prisma.productKPI.findUnique({
            where: { id: link.referenceId }
          });
        } else if (link.evidenceType === 'REPLAY') {
          entityDetails = await prisma.workflowSession.findUnique({
            where: { id: link.referenceId }
          });
        } else if (link.evidenceType === 'OUTCOME') {
          entityDetails = await prisma.productOutcome.findUnique({
            where: { id: link.referenceId }
          });
        } else if (link.evidenceType === 'ANOMALY') {
          entityDetails = await prisma.uXAnomaly.findUnique({
            where: { id: link.referenceId }
          });
        } else if (link.evidenceType === 'INVESTIGATION') {
          entityDetails = await prisma.investigationThread.findUnique({
            where: { id: link.referenceId }
          });
        }
      } catch (err) {
        console.error(`Error resolving evidence entity ${link.evidenceType} with ID ${link.referenceId}:`, err);
      }

      resolved.push({
        evidenceId: link.id,
        evidenceType: link.evidenceType,
        referenceId: link.referenceId,
        description: link.description,
        entityDetails
      });
    }

    return resolved;
  }
}
