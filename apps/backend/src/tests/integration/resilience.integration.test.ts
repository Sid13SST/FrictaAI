import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import { resetDatabase, integrationUser, foreignUser } from './setup';
import { clerkMiddleware } from '@hono/clerk-auth';
import { UXIntelligenceCoordinator } from '@fricta/ux-intelligence';

// Mock Clerk auth statically to intercept Bearer token and bypass Clerk network calls
vi.mock('@hono/clerk-auth', () => {
  return {
    clerkMiddleware: () => async (c: any, next: any) => {
      const authHeader = c.req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        if (token && token !== 'anonymous') {
          c.set('clerkAuth', { userId: token });
        }
      }
      await next();
    },
    getAuth: (c: any) => c.get('clerkAuth'),
  };
});

// Mock BrowserManager, SessionManager and scheduleWorkflow from @fricta/agent
const { mockLaunch, mockCreateContext, mockScheduleWorkflow } = vi.hoisted(() => {
  return {
    mockLaunch: vi.fn().mockResolvedValue(undefined),
    mockCreateContext: vi.fn().mockResolvedValue({}),
    mockScheduleWorkflow: vi.fn().mockResolvedValue({ id: 'job_123' }),
  };
});

vi.mock('@fricta/agent', () => {
  return {
    BrowserManager: vi.fn().mockImplementation(function() {
      return {
        launch: mockLaunch,
        createContext: mockCreateContext,
      };
    }),
    SessionManager: vi.fn().mockImplementation(function() {
      return {
        start: vi.fn().mockResolvedValue(undefined),
      };
    }),
    scheduleWorkflow: mockScheduleWorkflow,
    createAIProvider: () => {
      return {
        getModel: () => 'gpt-4-mock',
      };
    },
    startWorker: vi.fn(),
  };
});

// Import real routes
import { projectRoutes } from '../../routes/projects';
import { workflowRoutes } from '../../routes/workflows';
import { reportRoutes } from '../../routes/reports';
import { collaborationRoutes } from '../../routes/collaboration';
import { simulationRoutes } from '../../routes/simulation';
import { uxRoutes } from '../../routes/ux';
import { agentRoutes } from '../../routes/agent';
import { requireAuth } from '../../middleware/clerkAuth';

function createIntegrationApp() {
  const app = new Hono();
  
  app.use('*', clerkMiddleware());

  const protectedApi = new Hono();
  protectedApi.use('*', requireAuth);
  protectedApi.route('/projects', projectRoutes);
  protectedApi.route('/workflows', workflowRoutes);
  protectedApi.route('/reports', reportRoutes);
  protectedApi.route('/collaboration', collaborationRoutes);
  protectedApi.route('/simulation', simulationRoutes);
  protectedApi.route('/ux', uxRoutes);
  protectedApi.route('/agent', agentRoutes);

  app.route('/api', protectedApi);
  return app;
}

describe('Error Recovery & Resilience Integration Tests', () => {
  let app: Hono;

  beforeEach(async () => {
    app = createIntegrationApp();
    await resetDatabase();

    // Seed authenticated test users
    await prisma.user.createMany({
      data: [
        { id: integrationUser.id, email: integrationUser.email, name: integrationUser.name },
        { id: foreignUser.id, email: foreignUser.email, name: foreignUser.name },
      ],
    });

    vi.restoreAllMocks();
    mockScheduleWorkflow.mockReset();
    mockScheduleWorkflow.mockResolvedValue({ id: 'job_123' });
  });

  const authHeaders = {
    'Authorization': `Bearer ${integrationUser.id}`,
    'Content-Type': 'application/json',
  };

  // ─── Deliverable 7: Authentication Failures ───────────────────────────────
  describe('Authentication Failure Scenarios', () => {
    it('should return 401 when token is missing', async () => {
      const res = await app.request('/api/projects');
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Authentication required');
    });

    it('should return 401 when token is malformed', async () => {
      const res = await app.request('/api/projects', {
        headers: { 'Authorization': 'Bearer anonymous' }
      });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Authentication required');
    });
  });

  // ─── Deliverable 8: Authorization Failures ────────────────────────────────
  describe('Authorization Failure Scenarios', () => {
    it('should return 403 when foreign user accesses project', async () => {
      const foreignProject = await prisma.project.create({
        data: {
          projectName: 'Foreign Project',
          websiteUrl: 'https://foreign.com',
          userId: foreignUser.id,
        }
      });

      const res = await app.request(`/api/projects/${foreignProject.id}`, {
        headers: authHeaders,
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Access denied');
    });
  });

  // ─── Deliverable 3: Missing Resources ─────────────────────────────────────
  describe('Missing Resource Validation', () => {
    it('should return 404 Not Found for non-existent Project', async () => {
      const res = await app.request(`/api/projects/99999999-9999-9999-9999-999999999999`, {
        headers: authHeaders,
      });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe('Not found');
    });

    it('should return 404 Not Found for non-existent Report', async () => {
      const res = await app.request(`/api/reports/99999999-9999-9999-9999-999999999999`, {
        headers: authHeaders,
      });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe('Not found');
    });
  });

  // ─── Deliverable 4: Invalid Input Validation ──────────────────────────────
  describe('Invalid Input Validation', () => {
    it('should return 400 when creating project with empty projectName', async () => {
      const res = await app.request('/api/projects', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ projectName: '', websiteUrl: 'https://example.com' }),
      });
      expect(res.status).toBe(400);
    });

    it('should return 400 when starting workflow with missing parameters', async () => {
      const res = await app.request('/api/workflows/start', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ goal: 'Test Goal' }), // Missing projectId and url
      });
      expect(res.status).toBe(400);
    });
  });

  // ─── Deliverable 2: Database Failures & Transaction Rollback ─────────────────
  describe('Database Failure & Transaction Rollback Validation', () => {
    it('should handle Prisma query exception gracefully during project listing', async () => {
      const findManySpy = vi.spyOn(prisma.project, 'findMany').mockRejectedValue(new Error('Database connectivity issue'));
      
      const res = await app.request('/api/projects', {
        headers: authHeaders,
      });
      
      expect(res.status).toBe(200); // Route falls back to in-memory store cleanly
      const json = await res.json();
      expect(json.projects).toBeDefined();
      expect(findManySpy).toHaveBeenCalled();
    });

    it('should rollback transaction and perform no partial writes when nested creations fail', async () => {
      // 1. Setup session and initial report data in database
      const project = await prisma.project.create({
        data: { projectName: 'Integrate DB', websiteUrl: 'https://db.com', userId: integrationUser.id }
      });
      const session = await prisma.workflowSession.create({
        data: { projectId: project.id, goal: 'Integrate Goal', status: 'RUNNING' }
      });

      // Insert pre-existing signals that should NOT be deleted if transaction rolls back
      const signal = await prisma.uXSignal.create({
        data: { workflowSessionId: session.id, signalType: 'HESITATION', severity: 'LOW' }
      });

      // 2. Inject fault into tx.uXScore.create inside the report generation transaction block
      const origTransaction = prisma.$transaction;
      let scoreCreateCalled = false;

      const transactionSpy = vi.spyOn(prisma, '$transaction').mockImplementation(async (arg: any) => {
        if (typeof arg === 'function') {
          return origTransaction.call(prisma, async (tx: any) => {
            const proxyTx = new Proxy(tx, {
              get(target, prop) {
                if (prop === 'uXScore') {
                  return {
                    create: () => {
                      scoreCreateCalled = true;
                      throw new Error('Transaction rollback simulated');
                    },
                    deleteMany: target.uXScore.deleteMany.bind(target.uXScore),
                  };
                }
                return target[prop];
              }
            });
            return arg(proxyTx);
          });
        }
        return origTransaction.call(prisma, arg);
      });

      // 3. Trigger generate reports route
      const res = await app.request(`/api/reports/${session.id}/generate`, {
        method: 'POST',
        headers: authHeaders,
      });

      // 4. Asserts
      expect(res.status).toBe(500);
      expect(scoreCreateCalled).toBe(true);

      // Verify that the pre-existing signals were NOT deleted (proving full rollback occurred)
      const persistedSignal = await prisma.uXSignal.findUnique({
        where: { id: signal.id }
      });
      expect(persistedSignal).not.toBeNull();
    });
  });

  // ─── Deliverable 6: Queue & Redis Failure Validation ──────────────────────
  describe('Queue & Redis Failure Validation', () => {
    it('should fail fast and transition session to FAILED in DB when Redis queue is offline', async () => {
      const project = await prisma.project.create({
        data: { projectName: 'Redis Test Project', websiteUrl: 'https://redis.com', userId: integrationUser.id }
      });

      // Mock queue enqueuing to simulate Redis connection loss
      mockScheduleWorkflow.mockRejectedValue(new Error('Redis connection timed out'));

      const res = await app.request('/api/agent/workflow/run', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          projectId: project.id,
          url: 'https://redis.com/home',
          goal: 'Test queue offline',
        }),
      });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toContain('Redis connection timed out');

      // Verify that a WorkflowSession was created but immediately transitioned to FAILED status
      const failedSession = await prisma.workflowSession.findFirst({
        where: { projectId: project.id, status: 'FAILED' }
      });
      expect(failedSession).not.toBeNull();
    });
  });

  // ─── Unexpected Runtime & Observability Verification ───────────────────────
  describe('Unexpected Runtime Exceptions & Observability Verification', () => {
    it('should mark session as FAILED and log correlated error parameters when runtime crashes occur in UX intelligence', async () => {
      const project = await prisma.project.create({
        data: { projectName: 'Runtime Test Project', websiteUrl: 'https://crash.com', userId: integrationUser.id }
      });
      const session = await prisma.workflowSession.create({
        data: { projectId: project.id, goal: 'Analyze crash goal', status: 'RUNNING' }
      });

      // Inject unexpected runtime error during coordinator session analysis
      const coordinatorSpy = vi.spyOn(UXIntelligenceCoordinator.prototype, 'analyzeSession')
        .mockRejectedValue(new Error('Unexpected runtime exception in finding parser'));

      // Spy on console.error for observability checks
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const res = await app.request(`/api/ux/analyze/${session.id}`, {
        method: 'POST',
        headers: authHeaders,
      });

      expect(res.status).toBe(500);
      expect(coordinatorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Observability assertions: check if log contains sessionId and error description
      const loggedErrorCall = consoleErrorSpy.mock.calls.find(call => 
        call.some(arg => typeof arg === 'string' && arg.includes(session.id))
      );
      expect(loggedErrorCall).toBeDefined();

      // Check session status is marked as FAILED in database
      const dbSession = await prisma.workflowSession.findUnique({
        where: { id: session.id }
      });
      expect(dbSession?.status).toBe('FAILED');
      
      consoleErrorSpy.mockRestore();
    });
  });
});
