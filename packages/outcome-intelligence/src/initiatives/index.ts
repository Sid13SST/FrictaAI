import { prisma } from '@fricta/db';

export class InitiativeLinker {
  static async getInitiativeImpacts(projectId: string) {
    return prisma.initiativeImpact.findMany({
      where: {
        kpi: { projectId }
      },
      include: {
        kpi: true,
        outcome: {
          include: {
            initiative: true,
            evidence: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async linkEvidence(outcomeId: string, evidenceType: string, referenceId: string, description: string) {
    return prisma.outcomeEvidence.create({
      data: {
        outcomeId,
        evidenceType,
        referenceId,
        description
      }
    });
  }
}
