import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockPrisma } from '../mocks/prismaMock';

// Define the mock auth state before mocking the clerk module
const { mockAuth } = vi.hoisted(() => ({
  mockAuth: { userId: null as string | null, sessionId: null as string | null }
}));

// Mock external Clerk Auth module and the database
vi.mock('@hono/clerk-auth', () => ({
  getAuth: () => mockAuth,
  clerkMiddleware: () => (c: any, next: any) => next(),
}));
vi.mock('@fricta/db', () => ({ prisma: mockPrisma }));

import { Hono } from 'hono';
import { requireAuth } from '../../middleware/clerkAuth';
import {
  requireProjectOwner,
  requireProjectOwnerQuery,
  requireProjectOwnerBody,
  requireWorkflowOwner,
  requireReportOwner
} from '../../guards/ownership';
import { mockProject, mockWorkflow } from '../mocks/fixtures';

function createTestApp() {
  const app = new Hono();

  // Test routes configured with different authentication and authorization guards
  app.get('/protected', requireAuth, (c) => c.json({ success: true }));
  app.get('/project/:id', requireProjectOwner('id'), (c) => c.json({ success: true }));
  app.get('/project-query', requireProjectOwnerQuery('projectId'), (c) => c.json({ success: true }));
  app.post('/project-body', requireProjectOwnerBody('projectId'), (c) => c.json({ success: true }));
  app.get('/workflow/:id', requireWorkflowOwner('id'), (c) => c.json({ success: true }));
  app.get('/report/:id', requireReportOwner('id'), (c) => c.json({ success: true }));

  return app;
}

describe('Authentication & Ownership Guard Unit Tests', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
    mockAuth.userId = null;
    mockAuth.sessionId = null;
  });

  describe('requireAuth Middleware', () => {
    it('should reject requests with 401 when user is not authenticated', async () => {
      mockAuth.userId = null;

      const res = await app.request('/protected');
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Authentication required');
    });

    it('should allow requests when user is authenticated with a valid userId', async () => {
      mockAuth.userId = 'user_123';

      const res = await app.request('/protected');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe('requireProjectOwner Guard (Path Parameter)', () => {
    beforeEach(() => {
      mockAuth.userId = 'user_123';
    });

    it('should reject with 401 if user is unauthenticated', async () => {
      mockAuth.userId = null;
      const res = await app.request('/project/project_123');
      expect(res.status).toBe(401);
    });

    it('should return 404 if project does not exist', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const res = await app.request('/project/project_non_existent');
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe('Not found');
    });

    it('should return 403 if project is owned by another user', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project_123',
        userId: 'user_different',
      });

      const res = await app.request('/project/project_123');
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Access denied');
    });

    it('should allow access if project is owned by the authenticated user', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project_123',
        userId: 'user_123',
      });

      const res = await app.request('/project/project_123');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('should allow access to default demo project', async () => {
      const res = await app.request('/project/default-mem-project-id');
      expect(res.status).toBe(200);
    });
  });

  describe('requireProjectOwnerQuery Guard (Query Parameter)', () => {
    beforeEach(() => {
      mockAuth.userId = 'user_123';
    });

    it('should reject with 400 if query parameter is missing', async () => {
      const res = await app.request('/project-query');
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Missing projectId query parameter');
    });

    it('should return 403 if project is owned by another user', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project_123',
        userId: 'user_different',
      });

      const res = await app.request('/project-query?projectId=project_123');
      expect(res.status).toBe(403);
    });

    it('should allow access if project is owned by user', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project_123',
        userId: 'user_123',
      });

      const res = await app.request('/project-query?projectId=project_123');
      expect(res.status).toBe(200);
    });
  });

  describe('requireProjectOwnerBody Guard (JSON Body)', () => {
    beforeEach(() => {
      mockAuth.userId = 'user_123';
    });

    it('should reject with 400 if body field is missing', async () => {
      const res = await app.request('/project-body', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Missing projectId in request body');
    });

    it('should allow access if project is owned by user', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project_123',
        userId: 'user_123',
      });

      const res = await app.request('/project-body', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'project_123' }),
      });
      expect(res.status).toBe(200);
    });
  });

  describe('requireWorkflowOwner Guard (Traversal to Project)', () => {
    beforeEach(() => {
      mockAuth.userId = 'user_123';
    });

    it('should return 404 if workflow session does not exist', async () => {
      mockPrisma.workflowSession.findUnique.mockResolvedValue(null);

      const res = await app.request('/workflow/session_non_existent');
      expect(res.status).toBe(404);
    });

    it('should check project ownership and reject 403 if project is owned by another user', async () => {
      mockPrisma.workflowSession.findUnique.mockResolvedValue({
        id: 'workflow_123',
        projectId: 'project_123',
      });
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project_123',
        userId: 'user_different',
      });

      const res = await app.request('/workflow/workflow_123');
      expect(res.status).toBe(403);
    });

    it('should check project ownership and allow 200 if project is owned by user', async () => {
      mockPrisma.workflowSession.findUnique.mockResolvedValue({
        id: 'workflow_123',
        projectId: 'project_123',
      });
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project_123',
        userId: 'user_123',
      });

      const res = await app.request('/workflow/workflow_123');
      expect(res.status).toBe(200);
    });
  });

  describe('requireReportOwner Guard (Traversal)', () => {
    beforeEach(() => {
      mockAuth.userId = 'user_123';
    });

    it('should return 404 if report does not exist as either Executive or UX report', async () => {
      mockPrisma.executiveReport.findUnique.mockResolvedValue(null);
      mockPrisma.uXReport.findUnique.mockResolvedValue(null);

      const res = await app.request('/report/report_non_existent');
      expect(res.status).toBe(404);
    });

    it('should traverse ExecutiveReport and allow if project is owned by user', async () => {
      // 1. verifyReportOwnership finds ExecutiveReport
      mockPrisma.executiveReport.findUnique.mockResolvedValue({
        id: 'report_123',
        projectId: 'project_123',
      });
      mockPrisma.uXReport.findUnique.mockResolvedValue(null);
      
      // 2. verifyProjectOwnership checks parent project
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project_123',
        userId: 'user_123',
      });

      const res = await app.request('/report/report_123');
      expect(res.status).toBe(200);
    });

    it('should traverse UXReport -> WorkflowSession -> Project and allow if owned', async () => {
      // 1. verifyReportOwnership finds UXReport
      mockPrisma.executiveReport.findUnique.mockResolvedValue(null);
      mockPrisma.uXReport.findUnique.mockResolvedValue({
        id: 'report_456',
        sessionId: 'workflow_123',
      });

      // 2. verifyWorkflowOwnership checks session
      mockPrisma.workflowSession.findUnique.mockResolvedValue({
        id: 'workflow_123',
        projectId: 'project_123',
      });

      // 3. verifyProjectOwnership checks parent project
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project_123',
        userId: 'user_123',
      });

      const res = await app.request('/report/report_456');
      expect(res.status).toBe(200);
    });
  });

  describe('Assertion wrappers and helper boundary conditions', () => {
    it('should return correct results for assertions', async () => {
      const {
        assertProjectOwnership,
        assertWorkflowOwnership,
        assertReplayOwnership,
        assertReportOwnership,
        assertInvestigationOwnership,
        verifyAlertOwnership,
      } = await import('../../guards/ownership');

      mockPrisma.project.findUnique.mockResolvedValue({ id: 'p1', userId: 'user_123' });
      mockPrisma.workflowSession.findUnique.mockResolvedValue({ id: 's1', projectId: 'p1' });
      mockPrisma.executiveReport.findUnique.mockResolvedValue({ id: 'r1', projectId: 'p1' });
      mockPrisma.investigationThread.findUnique.mockResolvedValue({ id: 'i1', projectId: 'p1' });
      mockPrisma.operationalAlert.findUnique.mockResolvedValue({ id: 'a1', projectId: 'p1' });

      expect(await assertProjectOwnership('user_123', 'p1')).toBe(true);
      expect(await assertWorkflowOwnership('user_123', 's1')).toBe(true);
      expect(await assertReplayOwnership('user_123', 's1')).toBe(true);
      expect(await assertReportOwnership('user_123', 'r1')).toBe(true);
      expect(await assertInvestigationOwnership('user_123', 'i1')).toBe(true);
      expect(await verifyAlertOwnership('user_123', 'a1')).toBe('OWNED');

      // Database query rejections
      mockPrisma.project.findUnique.mockRejectedValue(new Error('DB Error'));
      expect(await assertProjectOwnership('user_123', 'p1')).toBe(false);

      mockPrisma.workflowSession.findUnique.mockRejectedValue(new Error('DB Error'));
      expect(await assertWorkflowOwnership('user_123', 's1')).toBe(false);

      mockPrisma.executiveReport.findUnique.mockRejectedValue(new Error('DB Error'));
      expect(await assertReportOwnership('user_123', 'r1')).toBe(false);

      mockPrisma.investigationThread.findUnique.mockRejectedValue(new Error('DB Error'));
      expect(await assertInvestigationOwnership('user_123', 'i1')).toBe(false);

      mockPrisma.operationalAlert.findUnique.mockRejectedValue(new Error('DB Error'));
      expect(await verifyAlertOwnership('user_123', 'a1')).toBe('NOT_FOUND');
    });

    it('should handle undefined parameter names in guards gracefully', async () => {
      const { requireProjectOwner, requireWorkflowOwner, requireReportOwner } = await import('../../guards/ownership');
      const guardProj = requireProjectOwner('non_existent_param');
      const guardFlow = requireWorkflowOwner('non_existent_param');
      const guardRep = requireReportOwner('non_existent_param');
      
      const appWithMissingParam = new Hono();
      appWithMissingParam.get('/test/proj/:id', guardProj, (c) => c.json({ success: true }));
      appWithMissingParam.get('/test/flow/:id', guardFlow, (c) => c.json({ success: true }));
      appWithMissingParam.get('/test/rep/:id', guardRep, (c) => c.json({ success: true }));
      
      mockAuth.userId = 'user_123';
      expect((await appWithMissingParam.request('/test/proj/project_123')).status).toBe(400);
      expect((await appWithMissingParam.request('/test/flow/session_123')).status).toBe(400);
      expect((await appWithMissingParam.request('/test/rep/report_123')).status).toBe(400);
    });

    it('should fallback to in-memory project and session check when DB has no record', async () => {
      const { verifyWorkflowOwnership } = await import('../../guards/ownership');
      const { memoryProjects, memorySessions } = await import('../../utils/memoryDb');

      // Add project and session to memory store
      memoryProjects.push({ id: 'mem-p1', projectName: 'Mem Proj', userId: null });
      memorySessions.set('mem-s1', { id: 'mem-s1', projectId: 'mem-p1' });

      // DB queries return null
      mockPrisma.workflowSession.findUnique.mockResolvedValue(null);
      mockPrisma.project.findUnique.mockResolvedValue(null);

      // Trigger traversal
      const result = await verifyWorkflowOwnership('user_123', 'mem-s1');
      expect(result).toBe('OWNED'); // bootstrapped to user_123 on first check

      // Check second user gets NOT_OWNED
      const resultOther = await verifyWorkflowOwnership('user_different', 'mem-s1');
      expect(resultOther).toBe('NOT_OWNED');
    });
  });

  describe('authContext Helper Functions', () => {
    it('should test getCurrentUser, requireUser, getCurrentUserId, and resolveUser', async () => {
      const {
        getCurrentUser,
        requireUser,
        getCurrentUserId,
        resolveUser,
      } = await import('../../middleware/authContext');

      const mockCtx: any = {
        get: (key: string) => {
          if (key === 'clerkAuth') return mockAuth;
          return null;
        },
        json: (body: any, status: number) => {
          return { body, status };
        },
      };

      // Unauthenticated
      mockAuth.userId = null;
      expect(getCurrentUser(mockCtx)).toBeNull();
      expect(getCurrentUserId(mockCtx)).toBeNull();
      expect(() => requireUser(mockCtx)).toThrow();
      expect(await resolveUser(mockCtx)).toBeNull();

      // Authenticated
      mockAuth.userId = 'user_123';
      expect(getCurrentUser(mockCtx)).toEqual({ userId: 'user_123', sessionId: undefined, email: undefined });
      expect(getCurrentUserId(mockCtx)).toBe('user_123');
      expect(requireUser(mockCtx)).toEqual({ userId: 'user_123', sessionId: undefined, email: undefined });

      // resolveUser - exists in DB
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user_123', name: 'Existing User' });
      expect(await resolveUser(mockCtx)).toEqual({ id: 'user_123', name: 'Existing User' });

      // resolveUser - create new user
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: 'user_123', name: 'Clerk User' });
      expect(await resolveUser(mockCtx)).toEqual({ id: 'user_123', name: 'Clerk User' });

      // resolveUser - create failure
      mockPrisma.user.create.mockRejectedValue(new Error('Creation failed'));
      expect(await resolveUser(mockCtx)).toBeNull();
    });
  });
});
