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
      // Behavioural 85/90/80 (overall 85) minus one HIGH UX finding (-10
      // smoothness) → scoreAudit gives 82. The raw stored 85 must not leak.
      expect(json.scores.overallScore).toBe(82);
      expect(json.scores.basis).toMatchObject({ goalReached: true, behaviouralOverall: 85, uxFindingsPenalty: 10, outcomeCap: null });
      expect(json.uxFindings).toHaveLength(1);
      // The stored list score is brought in line with the report.
      expect(mockPrisma.uXReport.update).toHaveBeenCalledWith({ where: { id: 'report_123' }, data: { score: 82 } });
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
      expect(json.overallScore).toBe(82);
      expect(json.overallUXGrade).toBe('B');
      expect(json.synthesizedInsights).toBeDefined();
    });
  });

  describe('grade reflects outcome and findings', () => {
    it('a dead-end (FAILED) audit with no findings is graded F, not A 100/100', async () => {
      mockPrisma.workflowSession.findUnique.mockImplementation(async (args: any) => {
        if (args.where.id !== 'workflow_123') return null;
        if (!args.include) return { projectId: 'project_123' };
        return {
          ...mockWorkflow,
          status: 'FAILED',
          scores: [{ clarityScore: 100, efficiencyScore: 100, smoothnessScore: 100, overallScore: 100 }],
          visualScores: [], uxFindings: [], cognitiveSignals: [], visualFindings: [],
        };
      });
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.uXReport.findFirst.mockResolvedValue({ id: 'report_dead', score: 100 });
      mockPrisma.personaProfile.findMany.mockResolvedValue([]);

      const exec = await (await app.request('/workflow_123/executive')).json();
      expect(exec.overallScore).toBe(55);
      expect(exec.overallUXGrade).toBe('F');
      const rep = await (await app.request('/workflow_123')).json();
      expect(rep.scores.overallScore).toBe(exec.overallScore);
      expect(rep.scores.basis.goalReached).toBe(false);
      // The stale stored 100 is corrected so the reports list agrees.
      expect(mockPrisma.uXReport.update).toHaveBeenCalledWith({ where: { id: 'report_dead' }, data: { score: 55 } });
    });

    it('visual defect findings lower the grade of a completed run', async () => {
      mockPrisma.workflowSession.findUnique.mockImplementation(async (args: any) => {
        if (args.where.id !== 'workflow_123') return null;
        if (!args.include) return { projectId: 'project_123' };
        return {
          ...mockWorkflow,
          status: 'COMPLETED',
          scores: [{ clarityScore: 100, efficiencyScore: 100, smoothnessScore: 100, overallScore: 100 }],
          visualScores: [], uxFindings: [], cognitiveSignals: [],
          visualFindings: [
            { id: 'v1', workflowSessionId: 'workflow_123', screenshotId: null, findingType: 'weak_cta', severity: 'high', title: 't', description: 'd', boundingBoxes: [], metadata: {}, timestamp: new Date() },
            { id: 'v2', workflowSessionId: 'workflow_123', screenshotId: null, findingType: 'vision_summary', severity: 'low', title: 't', description: 'd', boundingBoxes: [], metadata: {}, timestamp: new Date() },
          ],
        };
      });
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.uXReport.findFirst.mockResolvedValue({ id: 'report_vis', score: 100 });
      mockPrisma.personaProfile.findMany.mockResolvedValue([]);

      const rep = await (await app.request('/workflow_123')).json();
      expect(rep.scores.overallScore).toBeLessThan(100);
      expect(rep.scores.basis.visualFindingsPenalty).toBe(5);
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
