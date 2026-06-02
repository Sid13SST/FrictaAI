import { prisma } from '@fricta/db';

export class GraphNavigator {
  static async getConnectedNodes(projectId: string, entityId: string) {
    const outgoing = await prisma.knowledgeRelationship.findMany({
      where: { projectId, sourceId: entityId },
      include: { target: true }
    });

    const incoming = await prisma.knowledgeRelationship.findMany({
      where: { projectId, targetId: entityId },
      include: { source: true }
    });

    return {
      outgoing: outgoing.map(r => ({
        relationshipId: r.id,
        relationshipType: r.relationshipType,
        confidence: r.confidence,
        description: r.description,
        node: r.target
      })),
      incoming: incoming.map(r => ({
        relationshipId: r.id,
        relationshipType: r.relationshipType,
        confidence: r.confidence,
        description: r.description,
        node: r.source
      }))
    };
  }

  static async resolveDependencyChain(projectId: string, initiativeId: string) {
    const chain: any[] = [];
    let currentId = initiativeId;

    for (let depth = 0; depth < 5; depth++) {
      const dep = await prisma.dependencyRecord.findFirst({
        where: { projectId, targetInitiativeId: currentId }
      });
      if (!dep) break;
      
      const blockedBy = await prisma.productInitiative.findUnique({
        where: { id: dep.sourceInitiativeId }
      });
      if (!blockedBy) break;

      chain.push({
        dependencyId: dep.id,
        type: dep.dependencyType,
        propagatedRisk: dep.riskScore,
        initiative: blockedBy
      });

      currentId = dep.sourceInitiativeId;
    }

    return chain;
  }
}
