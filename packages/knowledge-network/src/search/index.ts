import { prisma } from '@fricta/db';
import { SearchResult } from '../types';

export class IntelligenceSearchEngine {
  static async searchGraph(projectId: string, query: string): Promise<SearchResult[]> {
    if (!query) return [];

    const normalizedQuery = query.toLowerCase().trim();

    const entities = await prisma.knowledgeEntity.findMany({
      where: { projectId }
    });

    const results: SearchResult[] = [];

    for (const entity of entities) {
      let score = 0;
      let matchType: 'NAME' | 'DESCRIPTION' | 'TYPE' | 'EVIDENCE' = 'NAME';

      if (entity.name.toLowerCase().includes(normalizedQuery)) {
        score = 1.0;
        matchType = 'NAME';
      } else if (entity.description && entity.description.toLowerCase().includes(normalizedQuery)) {
        score = 0.7;
        matchType = 'DESCRIPTION';
      } else if (entity.entityType.toLowerCase().includes(normalizedQuery)) {
        score = 0.5;
        matchType = 'TYPE';
      }

      if (score > 0) {
        results.push({
          node: {
            id: entity.id,
            projectId: entity.projectId,
            entityType: entity.entityType as any,
            referenceId: entity.referenceId,
            name: entity.name,
            description: entity.description,
            metadata: entity.metadata,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt
          },
          score,
          matchType
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }
}
