import { prisma } from '@fricta/db';

export class EvidenceTracker {
  /**
   * Compiles the evidence trace details for an initiative.
   * Resolves the linked database entities (anomalies, investigations, replays)
   * to produce a fully auditable evidence trail for product strategy decisions.
   */
  static async compileInitiativeEvidence(initiativeId: string) {
    const evidenceItems = await prisma.initiativeEvidence.findMany({
      where: { initiativeId }
    });

    const traces = [];
    for (const ev of evidenceItems) {
      let details: any = null;

      if (ev.evidenceType === 'ANOMALY') {
        details = await prisma.uXAnomaly.findUnique({
          where: { id: ev.referenceId }
        });
      } else if (ev.evidenceType === 'INVESTIGATION') {
        details = await prisma.investigationThread.findUnique({
          where: { id: ev.referenceId }
        });
      } else if (ev.evidenceType === 'REPLAY') {
        details = await prisma.liveSession.findUnique({
          where: { id: ev.referenceId }
        });
      }

      traces.push({
        id: ev.id,
        evidenceType: ev.evidenceType,
        referenceId: ev.referenceId,
        description: ev.description,
        resolvedDetails: details,
        createdAt: ev.createdAt
      });
    }

    return traces;
  }
}
