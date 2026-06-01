import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import {
  PortfolioManager,
  AlignmentEngine,
  DependencyAnalyzer
} from '@fricta/portfolio-intelligence';
import { RBACAuthorizationGuard } from '@fricta/rbac-core';

export const portfolioRoutes = new Hono();
const guard = new RBACAuthorizationGuard(prisma);

// User Resolver Helper
async function resolveUser(c: any): Promise<any> {
  const userId = c.req.query('userId') || c.req.header('X-User-Id');
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) return user;
  }
  const email = c.req.query('email') || c.req.header('X-User-Email');
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) return user;
  }
  return prisma.user.findFirst();
}

// Workspace Resolver Helper
async function resolveWorkspace(projectId: string | null | undefined, workspaceId: string | null | undefined): Promise<string | null> {
  if (workspaceId) return workspaceId;
  if (projectId) {
    const proj = await prisma.project.findUnique({ where: { id: projectId } });
    if (proj) return proj.workspaceId;
  }
  return null;
}

/**
 * GET /api/portfolio/health
 * Returns portfolio health snap averages and history logs.
 */
portfolioRoutes.get('/health', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const wId = await resolveWorkspace(projectId, workspaceId);

  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  // Trigger snapshot update to keep average rating logs fresh
  await PortfolioManager.computePortfolioHealth(projectId).catch(() => {});

  const health = await PortfolioManager.getPortfolioHealth(projectId);
  return c.json(health);
});

/**
 * GET /api/portfolio/alignment
 * Returns alignment mapping records.
 */
portfolioRoutes.get('/alignment', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const wId = await resolveWorkspace(projectId, workspaceId);

  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const alignments = await prisma.alignmentRecord.findMany({
    where: { portfolio: { projectId } },
    include: {
      initiative: true,
      objective: true
    },
    orderBy: { alignmentScore: 'desc' }
  });

  return c.json({ alignments });
});

/**
 * POST /api/portfolio/alignment/evaluate
 * Triggers portfolio alignment calculations.
 */
portfolioRoutes.post('/alignment/evaluate', async (c) => {
  const user = await resolveUser(c);
  const body = await c.req.json().catch(() => ({}));
  const { projectId, workspaceId, portfolioId } = body;

  if (!projectId || !portfolioId) {
    return c.json({ error: 'projectId and portfolioId are required' }, 400);
  }

  const wId = await resolveWorkspace(projectId, workspaceId);
  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const alignments = await AlignmentEngine.evaluatePortfolioAlignment(projectId, portfolioId);
  return c.json({ alignments });
});

/**
 * GET /api/portfolio/objectives
 * Lists portfolio objectives map coverage.
 */
portfolioRoutes.get('/objectives', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const wId = await resolveWorkspace(projectId, workspaceId);

  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const mappings = await prisma.portfolioObjective.findMany({
    where: { portfolio: { projectId } },
    include: {
      portfolio: true,
      objective: {
        include: {
          initiatives: true
        }
      }
    }
  });

  return c.json({ mappings });
});

/**
 * GET /api/portfolio/dependencies
 * Returns dependency trees and propagated risks.
 */
portfolioRoutes.get('/dependencies', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const wId = await resolveWorkspace(projectId, workspaceId);

  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  // Recalculate propagated risk values
  await DependencyAnalyzer.calculatePropagatedRisks(projectId).catch(() => {});

  const dependencies = await DependencyAnalyzer.getDependencies(projectId);
  return c.json({ dependencies });
});

/**
 * GET /api/portfolio/risks
 * Lists strategic gaps and organizational risks.
 */
portfolioRoutes.get('/risks', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const wId = await resolveWorkspace(projectId, workspaceId);

  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  // Detect and sync active strategic gaps
  await AlignmentEngine.detectStrategicGaps(projectId).catch(() => {});

  const gaps = await prisma.strategicGap.findMany({
    where: { projectId },
    orderBy: { severity: 'asc' }
  });

  const risks = await prisma.organizationalRisk.findMany({
    where: { portfolio: { projectId } },
    orderBy: { propagatedRisk: 'desc' }
  });

  return c.json({ gaps, risks });
});

/**
 * GET /api/portfolio/executive
 * Compiles investment allocation allocations and concentrations.
 */
portfolioRoutes.get('/executive', async (c) => {
  const user = await resolveUser(c);
  const projectId = c.req.query('projectId');
  const workspaceId = c.req.query('workspaceId');

  if (!projectId) return c.json({ error: 'projectId is required' }, 400);
  const wId = await resolveWorkspace(projectId, workspaceId);

  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'READ');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const allocations = await prisma.investmentAllocation.findMany({
    where: { portfolio: { projectId } },
    include: { portfolio: true }
  });

  return c.json({ allocations });
});

/**
 * POST /api/portfolio
 * Creates a new portfolio configuration.
 */
portfolioRoutes.post('/', async (c) => {
  const user = await resolveUser(c);
  const body = await c.req.json().catch(() => ({}));
  const { projectId, workspaceId, name, description, allocations } = body;

  if (!projectId || !name || !description) {
    return c.json({ error: 'projectId, name, and description are required' }, 400);
  }

  const wId = await resolveWorkspace(projectId, workspaceId);
  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const allocs = allocations && Array.isArray(allocations) ? allocations : [];
  const portfolio = await PortfolioManager.createPortfolio(projectId, name, description, allocs);

  return c.json(portfolio, 201);
});

/**
 * POST /api/portfolio/objectives
 * Links an objective to a portfolio.
 */
portfolioRoutes.post('/objectives', async (c) => {
  const user = await resolveUser(c);
  const body = await c.req.json().catch(() => ({}));
  const { projectId, workspaceId, portfolioId, objectiveId } = body;

  if (!portfolioId || !objectiveId) {
    return c.json({ error: 'portfolioId and objectiveId are required' }, 400);
  }

  const wId = await resolveWorkspace(projectId, workspaceId);
  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const mapping = await prisma.portfolioObjective.create({
    data: {
      portfolioId,
      objectiveId
    }
  });

  return c.json(mapping, 201);
});

/**
 * POST /api/portfolio/dependencies
 * Creates an initiative dependency link.
 */
portfolioRoutes.post('/dependencies', async (c) => {
  const user = await resolveUser(c);
  const body = await c.req.json().catch(() => ({}));
  const { projectId, workspaceId, sourceInitiativeId, targetInitiativeId, dependencyType } = body;

  if (!projectId || !sourceInitiativeId || !targetInitiativeId || !dependencyType) {
    return c.json({ error: 'projectId, sourceInitiativeId, targetInitiativeId, and dependencyType are required' }, 400);
  }

  const wId = await resolveWorkspace(projectId, workspaceId);
  if (wId) {
    const hasPerm = await guard.checkWorkspacePermission(user?.id || '', wId, 'ANALYTICS', 'WRITE');
    if (!hasPerm) return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  }

  const record = await DependencyAnalyzer.createDependency(
    projectId,
    sourceInitiativeId,
    targetInitiativeId,
    dependencyType
  );

  return c.json(record, 201);
});
