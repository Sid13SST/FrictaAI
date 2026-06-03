import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockPrisma } from '../mocks/prismaMock';

// Mock DB
vi.mock('@fricta/db', () => ({ prisma: mockPrisma }));

import { Hono } from 'hono';
import { reportRoutes } from '../../routes/reports';
import { mockWorkflow, mockProject, mockUser, mockFinding } from '../mocks/fixtures';

function createTestApp(userId: string = 'user_123') {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('clerkAuth', (() => ({ userId })) as any);
    await next();
  });
  app.route('/', reportRoutes);
  return app;
}

describe('Report Generation and Compilation Unit Tests', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp('user_123');
    vi.clearAllMocks();
  });

  describe('GET / - List reports', () => {
    it('should retrieve list of UX reports owned by user', async () => {
      const mockReportData = {
        id: 'report_123',
        sessionId: 'workflow_123',
        summary: 'Overall usability score: 92%',
        score: 92,
        createdAt: new Date(),
      };
      mockPrisma.uXReport.findMany.mockResolvedValue([mockReportData]);

      const res = await app.request('/');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.reports).toHaveLength(1);
      expect(json.reports[0].id).toBe(mockReportData.id);
      expect(mockPrisma.uXReport.findMany).toHaveBeenCalled();
    });
  });

  describe('POST /:sessionId/generate - Generate UX report', () => {
    it('should compile and generate report for valid session', async () => {
      // Mock ownership checks
      // 1. verifyWorkflowOwnership finds session
      mockPrisma.workflowSession.findUnique.mockImplementation(async (args: any) => {
        if (args.where.id === 'workflow_123') {
          // If called during report generation data fetch
          if (args.include) {
            return {
              ...mockWorkflow,
              actions: [],
              interactions: [],
              thoughts: [],
            };
          }
          // If called during ownership check
          return { projectId: 'project_123' };
        }
        return null;
      });
      // 2. verifyProjectOwnership finds project and checks owner
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);

      // Mock report summary lookup
      mockPrisma.uXReport.findFirst.mockResolvedValue(null);

      // Mock database writes inside transaction
      mockPrisma.uXSignal.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.uXRecommendation.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.uXScore.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.uXScore.create.mockResolvedValue({ id: 'score_123' });
      mockPrisma.uXReport.create.mockResolvedValue({ id: 'report_123' });

      const res = await app.request('/workflow_123/generate', {
        method: 'POST',
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.reportData).toBeDefined();
    });
  });

  describe('GET /:id - Fetch unified report payload', () => {
    it('should return compiled payload with findings and scores', async () => {
      // Mock ownership checks
      mockPrisma.workflowSession.findUnique.mockImplementation(async (args: any) => {
        if (args.where.id === 'workflow_123') {
          if (args.include) {
            // Detailed payload fetch
            return {
              ...mockWorkflow,
              scores: [{ clarityScore: 85, efficiencyScore: 90, smoothnessScore: 80, overallScore: 85 }],
              visualScores: [],
              uxFindings: [mockFinding],
              cognitiveSignals: [],
              visualFindings: [],
            };
          }
          return { projectId: 'project_123' };
        }
        return null;
      });
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.uXReport.findFirst.mockResolvedValue({ id: 'report_123' });
      mockPrisma.personaProfile.findMany.mockResolvedValue([]);

      const res = await app.request('/workflow_123');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.scores).toBeDefined();
      expect(json.scores.overallScore).toBe(85);
      expect(json.uxFindings).toHaveLength(1);
    });
  });

  describe('GET /:id/executive - Fetch synthesized executive summary', () => {
    it('should compile executive summary for session', async () => {
      mockPrisma.workflowSession.findUnique.mockImplementation(async (args: any) => {
        if (args.where.id === 'workflow_123') {
          if (args.include) {
            return {
              ...mockWorkflow,
              scores: [{ clarityScore: 85, efficiencyScore: 90, smoothnessScore: 80, overallScore: 85 }],
              visualScores: [],
              uxFindings: [mockFinding],
              cognitiveSignals: [],
              visualFindings: [],
            };
          }
          return { projectId: 'project_123' };
        }
        return null;
      });
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.personaProfile.findMany.mockResolvedValue([]);

      const res = await app.request('/workflow_123/executive');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.overallScore).toBe(85);
      expect(json.overallUXGrade).toBe('B');
      expect(json.synthesizedInsights).toBeDefined();
    });
  });

  describe('GET /:id/export - Export report payload', () => {
    it('should generate markdown and json export formats', async () => {
      mockPrisma.workflowSession.findUnique.mockImplementation(async (args: any) => {
        if (args.where.id === 'workflow_123') {
          if (args.include) {
            return {
              ...mockWorkflow,
              scores: [{ clarityScore: 85, efficiencyScore: 90, smoothnessScore: 80, overallScore: 85 }],
              visualScores: [],
              uxFindings: [mockFinding],
              cognitiveSignals: [],
              visualFindings: [],
            };
          }
          return { projectId: 'project_123' };
        }
        return null;
      });
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.personaProfile.findMany.mockResolvedValue([]);

      const res = await app.request('/workflow_123/export');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.markdown).toBeDefined();
      expect(json.developerJson).toBeDefined();
    });
  });
});
