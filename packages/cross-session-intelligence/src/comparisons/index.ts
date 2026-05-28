import { prisma } from '@fricta/db';
import { ComparisonResult } from '../types';

export class CrossSessionComparator {
  /**
   * Compares two sessions directly to identify shared friction and path variances.
   */
  static async compareSessions(sessionAId: string, sessionBId: string, projectId: string, workspaceId: string | null): Promise<ComparisonResult | null> {
    const sessionA = await prisma.workflowSession.findUnique({
      where: { id: sessionAId },
      include: { uxFindings: true }
    });

    const sessionB = await prisma.workflowSession.findUnique({
      where: { id: sessionBId },
      include: { uxFindings: true }
    });

    if (!sessionA || !sessionB) {
      return null;
    }

    // Find shared friction points
    const sharedFriction: string[] = [];
    const titlesA = sessionA.uxFindings.map(f => f.title.toLowerCase().trim());
    const titlesB = sessionB.uxFindings.map(f => f.title.toLowerCase().trim());

    titlesA.forEach((title) => {
      if (titlesB.includes(title) && !sharedFriction.includes(title)) {
        sharedFriction.push(title);
      }
    });

    // Compute similarity score
    const totalUnique = new Set([...titlesA, ...titlesB]).size;
    const similarity = totalUnique > 0 ? sharedFriction.length / totalUnique : 1.0;

    // Check if correlation already exists
    const existing = await prisma.sessionCorrelation.findFirst({
      where: {
        projectId,
        sessionAId,
        sessionBId
      }
    });

    const deltaNotes = `Compared session ${sessionAId} and ${sessionBId}. Shared friction overlap: ${sharedFriction.length} points.`;

    if (existing) {
      const updated = await prisma.sessionCorrelation.update({
        where: { id: existing.id },
        data: {
          similarity,
          sharedFriction,
          deltaNotes
        }
      });
      return {
        sessionAId,
        sessionBId,
        similarity: updated.similarity,
        sharedFriction: updated.sharedFriction as string[],
        deltaNotes: updated.deltaNotes || undefined
      };
    } else {
      const created = await prisma.sessionCorrelation.create({
        data: {
          workspaceId,
          projectId,
          sessionAId,
          sessionBId,
          similarity,
          sharedFriction,
          deltaNotes
        }
      });
      return {
        sessionAId,
        sessionBId,
        similarity: created.similarity,
        sharedFriction: created.sharedFriction as string[],
        deltaNotes: created.deltaNotes || undefined
      };
    }
  }
}
