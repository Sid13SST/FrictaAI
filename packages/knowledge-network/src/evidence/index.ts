import { prisma } from '@fricta/db';
import { EvidenceNode } from '../types';

export class EvidenceLinker {
  static async resolveEvidenceTrail(projectId: string, relationshipId: string): Promise<EvidenceNode[]> {
    const links = await prisma.evidenceLink.findMany({
      where: { relationshipId }
    });

    const nodes: EvidenceNode[] = [];

    for (const link of links) {
      let entityDetails: any = null;

      try {
        if (link.evidenceType === 'KPI') {
          entityDetails = await prisma.productKPI.findUnique({
            where: { id: link.referenceId }
          });
        } else if (link.evidenceType === 'INITIATIVE') {
          entityDetails = await prisma.productInitiative.findUnique({
            where: { id: link.referenceId }
          });
        } else if (link.evidenceType === 'OBJECTIVE') {
          entityDetails = await prisma.strategicObjective.findUnique({
            where: { id: link.referenceId }
          });
        } else if (link.evidenceType === 'OUTCOME') {
          entityDetails = await prisma.productOutcome.findUnique({
            where: { id: link.referenceId }
          });
        } else if (link.evidenceType === 'UX_ANOMALY') {
          entityDetails = await prisma.uXAnomaly.findUnique({
            where: { id: link.referenceId }
          });
        } else if (link.evidenceType === 'REPLAY') {
          entityDetails = await prisma.workflowSession.findUnique({
            where: { id: link.referenceId }
          });
        } else if (link.evidenceType === 'INVESTIGATION') {
          entityDetails = await prisma.investigationThread.findUnique({
            where: { id: link.referenceId }
          });
        }
      } catch (err) {}

      nodes.push({
        evidenceId: link.id,
        evidenceType: link.evidenceType,
        referenceId: link.referenceId,
        description: link.description,
        entityDetails
      });
    }

    return nodes;
  }
}
