import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockPrisma } from '../mocks/prismaMock';

// Mock DB
vi.mock('@fricta/db', () => ({ prisma: mockPrisma }));

import { Hono } from 'hono';
import { simulationRoutes } from '../../routes/simulation';
import { mockReplay } from '../mocks/fixtures';

function createTestApp(userId: string = 'user_123') {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('clerkAuth', (() => ({ userId })) as any);
    await next();
  });
  app.route('/', simulationRoutes);
  return app;
}

describe('Replay Service Unit Tests', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp('user_123');
    vi.clearAllMocks();
  });

  describe('GET /replay - Fetch Replay Events', () => {
    it('should retrieve replay events if sessionId is provided and exists', async () => {
      // /replay verifies workflow ownership before querying — stub the session
      // lookup it traverses through (projectId 'default-mem-project-id' is the
      // guard's built-in demo-project bypass, so any authenticated user owns it).
      mockPrisma.workflowSession.findUnique.mockResolvedValue({ projectId: 'default-mem-project-id' });
      mockPrisma.behavioralReplayEvent.findMany.mockResolvedValue([mockReplay]);

      const res = await app.request('/replay?sessionId=workflow_123');
      expect(res.status).toBe(200);
      
      const json = await res.json();
      expect(json.events).toHaveLength(1);
      expect(json.events[0].id).toBe(mockReplay.id);
      expect(mockPrisma.behavioralReplayEvent.findMany).toHaveBeenCalledWith({
        where: { workflowSessionId: 'workflow_123' },
        orderBy: { stepIndex: 'asc' },
      });
    });

    it('should return empty list if session has no replay events stored', async () => {
      mockPrisma.workflowSession.findUnique.mockResolvedValue({ projectId: 'default-mem-project-id' });
      mockPrisma.behavioralReplayEvent.findMany.mockResolvedValue([]);

      const res = await app.request('/replay?sessionId=workflow_456');
      expect(res.status).toBe(200);
      
      const json = await res.json();
      expect(json.events).toHaveLength(0);
    });

    it('should reject requests with missing sessionId', async () => {
      const res = await app.request('/replay');
      expect(res.status).toBe(400);
      
      const json = await res.json();
      expect(json.error).toBe('sessionId is required');
    });
  });
});
