import { prisma } from '@fricta/db';

export class GraphHealthEngine {
  static async evaluateGraphHealth(projectId: string) {
    const nodesCount = await prisma.knowledgeEntity.count({ where: { projectId } });
    const edgesCount = await prisma.knowledgeRelationship.count({ where: { projectId } });

    const relationNodes = new Set<string>();
    const relationships = await prisma.knowledgeRelationship.findMany({
      where: { projectId },
      select: { sourceId: true, targetId: true }
    });

    for (const rel of relationships) {
      relationNodes.add(rel.sourceId);
      relationNodes.add(rel.targetId);
    }

    const orphanCount = Math.max(0, nodesCount - relationNodes.size);

    const possibleEdges = nodesCount > 1 ? nodesCount * (nodesCount - 1) : 1;
    const density = Math.min(1.0, edgesCount / possibleEdges) * 100.0;
    const connectivity = nodesCount > 0 ? (relationNodes.size / nodesCount) * 100.0 : 100.0;
    
    const stabilityIndex = Math.max(0, connectivity - (orphanCount * 2.0));

    const check = await prisma.graphHealthRecord.create({
      data: {
        projectId,
        density,
        connectivity,
        orphanCount,
        stabilityIndex
      }
    });

    return check;
  }
}
