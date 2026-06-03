import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockPrisma } from '../mocks/prismaMock';

// Mock dependencies
const { mockLaunch, mockCreateContext } = vi.hoisted(() => {
  return {
    mockLaunch: vi.fn().mockResolvedValue(undefined),
    mockCreateContext: vi.fn().mockResolvedValue({}),
  };
});

vi.mock('@fricta/db', () => ({ prisma: mockPrisma }));
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
  };
});
vi.mock('@fricta/visual-engine', () => {
  return {
    VisualTimelineManager: vi.fn().mockImplementation(function() {
      return {};
    }),
    VisualStorageManager: vi.fn().mockImplementation(function() {
      return {
        resolvePath: vi.fn().mockReturnValue('/mock/path.webp'),
      };
    }),
  };
});

import { Hono } from 'hono';
import { workflowRoutes } from '../../routes/workflows';
import { mockWorkflow, mockProject } from '../mocks/fixtures';
import { BrowserManager } from '@fricta/agent';

function createTestApp(userId: string = 'user_123') {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('clerkAuth', (() => ({ userId })) as any);
    await next();
  });
  app.route('/', workflowRoutes);
  return app;
}

describe('Workflow Lifecycle Unit Tests', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp('user_123');
    vi.clearAllMocks();
    mockLaunch.mockReset();
    mockLaunch.mockResolvedValue(undefined);
    mockCreateContext.mockReset();
    mockCreateContext.mockResolvedValue({});
  });

  describe('GET / - List Workflow Sessions', () => {
    it('should retrieve list of workflow sessions for a project', async () => {
      // Setup verifyProjectOwnership query mock
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.workflowSession.findMany.mockResolvedValue([mockWorkflow]);

      const res = await app.request('/?projectId=project_123');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.sessions).toHaveLength(1);
      expect(json.sessions[0].id).toBe(mockWorkflow.id);
      expect(mockPrisma.workflowSession.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project_123' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('POST /start - Start Workflow Session', () => {
    it('should successfully start a workflow session', async () => {
      // Setup project ownership & session creation mocks
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.workflowSession.create.mockResolvedValue(mockWorkflow);

      const res = await app.request('/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'project_123',
          url: 'https://test-fricta.ai/onboarding',
          goal: 'Test User Workflow Goal',
          persona: 'BEGINNER',
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toBe('Session started successfully');
      expect(json.sessionId).toBe(mockWorkflow.id);
      expect(mockPrisma.workflowSession.create).toHaveBeenCalled();
    });

    it('should reject requests with missing url', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);

      const res = await app.request('/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'project_123',
        }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('projectId and url are required');
    });
  });

  describe('Workflow Status transitions', () => {
    it('should correctly capture failed transitions if browser fails to launch', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.workflowSession.create.mockResolvedValue(mockWorkflow);
      mockPrisma.workflowSession.update.mockResolvedValue({ ...mockWorkflow, status: 'FAILED' });

      // Mock BrowserManager launch rejection
      mockLaunch.mockRejectedValueOnce(new Error('Browser launch timeout'));

      const res = await app.request('/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'project_123',
          url: 'https://test-fricta.ai/onboarding',
        }),
      });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('Browser launch timeout');
      expect(mockPrisma.workflowSession.update).toHaveBeenCalled();
    });
  });
});
