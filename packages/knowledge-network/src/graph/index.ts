import { prisma } from '@fricta/db';
import { GraphData } from '../types';

export class KnowledgeGraphEngine {
  static async getGraph(projectId: string): Promise<GraphData> {
    const nodes = await prisma.knowledgeEntity.findMany({
      where: { projectId }
    });

    const edgesRaw = await prisma.knowledgeRelationship.findMany({
      where: { projectId },
      include: {
        evidenceLinks: true
      }
    });

    const edges = edgesRaw.map(e => ({
      id: e.id,
      projectId: e.projectId,
      sourceId: e.sourceId,
      targetId: e.targetId,
      relationshipType: e.relationshipType as any,
      confidence: e.confidence,
      description: e.description,
      metadata: e.metadata,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      evidenceCount: e.evidenceLinks.length
    }));

    return {
      nodes: nodes.map(n => ({
        id: n.id,
        projectId: n.projectId,
        entityType: n.entityType as any,
        referenceId: n.referenceId,
        name: n.name,
        description: n.description,
        metadata: n.metadata,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt
      })),
      edges
    };
  }

  static async getGraphSnapshot(projectId: string) {
    const graph = await this.getGraph(projectId);
    
    const snapshot = await prisma.graphSnapshot.create({
      data: {
        projectId,
        entityCount: graph.nodes.length,
        relationCount: graph.edges.length,
        snapshotData: JSON.parse(JSON.stringify(graph))
      }
    });

    return snapshot;
  }
}
