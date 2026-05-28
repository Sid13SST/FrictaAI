import { prisma } from '@fricta/db';

export class CrossSessionReasoner {
  /**
   * Evaluates session data over a workspace and matches overlapping findings.
   */
  static async evaluateCrossSessionCorrelations(projectId: string, workspaceId: string | null) {
    const sessions = await prisma.workflowSession.findMany({
      where: { projectId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    if (sessions.length < 2) {
      return [];
    }

    const correlations = [];

    // Compare pairs sequentially
    for (let i = 0; i < sessions.length - 1; i++) {
      const sessionA = sessions[i];
      const sessionB = sessions[i + 1];

      // Find shared findings
      const findingsA = await prisma.uXFinding.findMany({ where: { workflowSessionId: sessionA.id } });
      const findingsB = await prisma.uXFinding.findMany({ where: { workflowSessionId: sessionB.id } });

      const sharedFriction = [];
      for (const fA of findingsA) {
        const matching = findingsB.find(fB => fB.title === fA.title);
        if (matching) {
          sharedFriction.push(fA.title);
        }
      }

      const totalUnique = new Set([...findingsA.map(f => f.title), ...findingsB.map(f => f.title)]).size;
      const similarity = totalUnique > 0 ? sharedFriction.length / totalUnique : 1.0;

      // Upsert SessionCorrelation
      const correlation = await prisma.sessionCorrelation.create({
        data: {
          workspaceId,
          projectId,
          sessionAId: sessionA.id,
          sessionBId: sessionB.id,
          similarity,
          sharedFriction,
          deltaNotes: `Correlation calculated between ${sessionA.id} and ${sessionB.id}. Shared friction overlaps: ${sharedFriction.length}`
        }
      });
      correlations.push(correlation);
    }

    return correlations;
  }
}
