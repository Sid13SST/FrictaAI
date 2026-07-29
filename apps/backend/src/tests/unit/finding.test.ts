import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockPrisma } from '../mocks/prismaMock';

// Mock DB
vi.mock('@fricta/db', () => ({ prisma: mockPrisma }));

import { Hono } from 'hono';
import { uxRoutes } from '../../routes/ux';
import { mockWorkflow, mockFinding } from '../mocks/fixtures';

function createTestApp(userId: string = 'user_123') {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('clerkAuth', (() => ({ userId })) as any);
    await next();
  });
  app.route('/', uxRoutes);
  return app;
}

describe('UX Findings and Intelligence Unit Tests', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp('user_123');
    vi.clearAllMocks();
  });

  describe('GET /findings/:sessionId', () => {
    it('should retrieve list of UX findings for a session', async () => {
      mockPrisma.uXFinding.findMany.mockResolvedValue([mockFinding]);

      const res = await app.request('/findings/workflow_123');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.findings).toHaveLength(1);
      expect(json.findings[0].id).toBe(mockFinding.id);
      expect(json.findings[0].title).toBe(mockFinding.title);
      expect(mockPrisma.uXFinding.findMany).toHaveBeenCalledWith({
        where: { workflowSessionId: 'workflow_123' },
        orderBy: { timestamp: 'asc' },
      });
    });

    it('should return 500 error if findings query fails', async () => {
      mockPrisma.uXFinding.findMany.mockRejectedValue(new Error('DB Query Error'));

      const res = await app.request('/findings/workflow_123');
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('DB Query Error');
    });
  });

  describe('GET /cognitive/:sessionId', () => {
    it('should retrieve cognitive signals for a session', async () => {
      const mockSignal = {
        id: 'signal_123',
        workflowSessionId: 'workflow_123',
        signalType: 'HESITATION',
        intensity: 0.8,
        metadata: { idleTimeMs: 16000 },
        timestamp: new Date(),
      };
      mockPrisma.cognitiveSignal.findMany.mockResolvedValue([mockSignal]);

      const res = await app.request('/cognitive/workflow_123');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.signals).toHaveLength(1);
      expect(json.signals[0].id).toBe(mockSignal.id);
      expect(mockPrisma.cognitiveSignal.findMany).toHaveBeenCalledWith({
        where: { workflowSessionId: 'workflow_123' },
        orderBy: { timestamp: 'asc' },
      });
    });
  });

  describe('GET /recommendations/:sessionId', () => {
    it('should map raw findings to pattern recommendations', async () => {
      mockPrisma.uXFinding.findMany.mockResolvedValue([mockFinding]);

      const res = await app.request('/recommendations/workflow_123');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.recommendations).toBeDefined();
      expect(Array.isArray(json.recommendations)).toBe(true);
      expect(json.recommendations.length).toBeGreaterThan(0);
      expect(mockPrisma.uXFinding.findMany).toHaveBeenCalledWith({
        where: { workflowSessionId: 'workflow_123' },
      });
    });
  });

  describe('POST /analyze/:sessionId', () => {
    it('should analyze workflow session activity and persist findings', async () => {
      // Mock session details with actions, thoughts, and screenshots for analysis trigger
      const mockSessionWithTelemetry = {
        ...mockWorkflow,
        actions: [
          {
            id: 'action_1',
            action: 'fill',
            target: 'input#email',
            value: 'admin@fricta.ai',
            status: 'completed',
            stepNumber: 1,
            errorMessage: null,
            timestamp: new Date('2026-01-01T00:00:00.000Z'),
          },
          {
            id: 'action_2',
            action: 'click',
            target: 'button#submit',
            value: null,
            status: 'completed',
            stepNumber: 2,
            errorMessage: null,
            timestamp: new Date('2026-01-01T00:00:25.000Z'), // >15s gap (triggers hesitation signal)
          },
        ],
        thoughts: [
          {
            id: 'thought_1',
            thought: 'Not sure where to click, looks complex.', // triggers uncertainty keywords
            stepNumber: 2,
            timestamp: new Date('2026-01-01T00:00:25.000Z'),
          },
        ],
        interactions: [],
        workflowScreenshots: [
          {
            id: 'screenshot_1',
            stepIndex: 1,
            pageUrl: 'https://test-fricta.ai/login',
            metadata: JSON.stringify({ findings: [] }),
          },
          {
            id: 'screenshot_2',
            stepIndex: 2,
            pageUrl: 'https://test-fricta.ai/login',
            metadata: JSON.stringify({ findings: [] }),
          },
        ],
      };

      mockPrisma.workflowSession.findUnique.mockResolvedValue(mockSessionWithTelemetry);
      mockPrisma.personaProfile.count.mockResolvedValue(1); // skip seeding
      mockPrisma.uXFinding.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.cognitiveSignal.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.uXFinding.createMany.mockImplementation(async (args: any) => ({ count: args.data.length }));
      mockPrisma.cognitiveSignal.createMany.mockImplementation(async (args: any) => ({ count: args.data.length }));
      // The coordinator re-fetches after createMany (createMany doesn't return rows) —
      // echo back what was actually persisted rather than a stale/unrelated fixture,
      // since clearAllMocks() doesn't reset mockResolvedValue()s set by earlier tests.
      mockPrisma.uXFinding.findMany.mockImplementation(async () =>
        (mockPrisma.uXFinding.createMany.mock.calls[0]?.[0]?.data || []).map((f: any, i: number) => ({ id: `finding_${i}`, ...f }))
      );
      mockPrisma.cognitiveSignal.findMany.mockImplementation(async () =>
        (mockPrisma.cognitiveSignal.createMany.mock.calls[0]?.[0]?.data || []).map((s: any, i: number) => ({ id: `signal_${i}`, ...s }))
      );
      mockPrisma.workflowSession.update.mockResolvedValue(mockWorkflow);

      const res = await app.request('/analyze/workflow_123', {
        method: 'POST',
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.findings).toBeDefined();
      expect(json.cognitiveSignals).toBeDefined();

      // Verify that analysis found a hesitation finding since we set a 25s gap + confused thoughts
      const onboardingFriction = json.findings.find((f: any) => f.findingType === 'ONBOARDING_FRICTION');
      expect(onboardingFriction).toBeDefined();
      expect(onboardingFriction.severity).toBe('MEDIUM'); // 1 hesitation

      // Verify DB writes
      expect(mockPrisma.uXFinding.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.cognitiveSignal.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.uXFinding.createMany).toHaveBeenCalled();
      expect(mockPrisma.cognitiveSignal.createMany).toHaveBeenCalled();
      expect(mockPrisma.workflowSession.update).toHaveBeenCalled();
    });

    it('should throw 500 error if session is not found', async () => {
      mockPrisma.workflowSession.findUnique.mockResolvedValue(null);

      const res = await app.request('/analyze/non_existent_session', {
        method: 'POST',
      });
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toContain('not found');
    });
  });
});
