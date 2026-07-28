import { resolveUser } from '../middleware';
import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import {
  KnowledgeGraphEngine,
  EntityManager,
  RelationshipEngine,
  DiscoveryEngine,
  EvidenceLinker,
  ReasoningEngine,
  IntelligenceSearchEngine,
  GraphTimelineManager,
  GraphHealthEngine
} from '@fricta/knowledge-network';
import { RBACAuthorizationGuard } from '@fricta/rbac-core';
import { verifyProjectOwnership } from '../guards/ownership';

export const knowledgeRoutes = new Hono();
const guard = new RBACAuthorizationGuard(prisma);



async function resolveWorkspace(projectId: string | null | undefined, workspaceId: string | null | undefined): Promise<string | null> {
  if (workspaceId) return workspaceId;
  if (projectId) {
    const proj = await prisma.project.findUnique({ where: { id: projectId } });
    if (proj) return proj.workspaceId;
  }
  return null;
}

// Project ownership is the non-bypassable baseline (also covers solo/standalone
// projects with no workspace); workspace permission is an additional layer on top.
async function authorizeRead(c: any, projectId: string, user: any): Promise<boolean> {
  const ownership = await verifyProjectOwnership(user?.id || '', projectId);
  if (ownership !== 'OWNED') return false;

  const wId = await resolveWorkspace(projectId, null);
  if (wId) {
    return guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
  }
  return true;
}

async function authorizeWrite(c: any, projectId: string, user: any): Promise<boolean> {
  const ownership = await verifyProjectOwnership(user?.id || '', projectId);
  if (ownership !== 'OWNED') return false;

  const wId = await resolveWorkspace(projectId, null);
  if (wId) {
    return guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'WRITE');
  }
  return true;
}

/**
 * GET /api/knowledge/entities
 */
knowledgeRoutes.get('/entities', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const hasPerm = await authorizeRead(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const entities = await prisma.knowledgeEntity.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' }
  });
  return c.json({ entities });
});

/**
 * GET /api/knowledge/relationships
 */
knowledgeRoutes.get('/relationships', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const hasPerm = await authorizeRead(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const graph = await KnowledgeGraphEngine.getGraph(projectId);
  return c.json({ relationships: graph.edges });
});

/**
 * GET /api/knowledge/discovery
 */
knowledgeRoutes.get('/discovery', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const hasPerm = await authorizeRead(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  await DiscoveryEngine.runDiscovery(projectId).catch(() => {});

  const discoveries = await prisma.discoveryRecord.findMany({
    where: { projectId },
    orderBy: { discoveredAt: 'desc' }
  });
  return c.json({ discoveries });
});

/**
 * GET /api/knowledge/search
 */
knowledgeRoutes.get('/search', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const query = c.req.query('q') || '';
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const hasPerm = await authorizeRead(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const results = await IntelligenceSearchEngine.searchGraph(projectId, query);
  return c.json({ results });
});

/**
 * GET /api/knowledge/evidence/:id
 */
knowledgeRoutes.get('/evidence/:id', async (c) => {
  const user = await resolveUser(c);
  const relationshipId = c.req.param('id');
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const hasPerm = await authorizeRead(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const evidence = await EvidenceLinker.resolveEvidenceTrail(projectId, relationshipId);
  return c.json({ evidence });
});

/**
 * GET /api/knowledge/timeline
 */
knowledgeRoutes.get('/timeline', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const hasPerm = await authorizeRead(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const timeline = await GraphTimelineManager.getGraphTimeline(projectId);
  return c.json({ timeline });
});

/**
 * GET /api/knowledge/health
 */
knowledgeRoutes.get('/health', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const hasPerm = await authorizeRead(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  await GraphHealthEngine.evaluateGraphHealth(projectId).catch(() => {});

  const healthRecords = await prisma.graphHealthRecord.findMany({
    where: { projectId },
    orderBy: { checkedAt: 'desc' },
    take: 10
  });

  const alignment = await ReasoningEngine.evaluateStrategicAlignment(projectId);

  return c.json({
    healthRecords,
    alignment
  });
});

/**
 * POST /api/knowledge/sync
 */
knowledgeRoutes.post('/sync', async (c) => {
  const user = await resolveUser(c);
  const body = await c.req.json().catch(() => ({}));
  const { projectId } = body;
  if (!projectId) return c.json({ error: 'projectId is required' }, 400);

  const hasPerm = await authorizeWrite(c, projectId, user);
  if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);

  const entityLogs = await EntityManager.syncProjectEntities(projectId);
  const relLogs = await RelationshipEngine.syncProjectRelationships(projectId);
  
  await KnowledgeGraphEngine.getGraphSnapshot(projectId).catch(() => {});
  await GraphHealthEngine.evaluateGraphHealth(projectId).catch(() => {});

  return c.json({
    success: true,
    logs: [...entityLogs, ...relLogs]
  });
});
