import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import { resetDatabase, integrationUser, integrationProject, integrationWorkflow } from './setup';
import { clerkMiddleware } from '@hono/clerk-auth';

// Mock BrowserManager and SessionManager to avoid running a real Playwright headless browser
const { mockLaunch, mockCreateContext } = vi.hoisted(() => {
  return {
    mockLaunch: vi.fn().mockResolvedValue(undefined),
    mockCreateContext: vi.fn().mockResolvedValue({}),
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
    startWorker: vi.fn(),
  };
});

// Mock @hono/clerk-auth to resolve user identities from request Bearer tokens
vi.mock('@hono/clerk-auth', () => {
  return {
    clerkMiddleware: () => async (c: any, next: any) => {
      const authHeader = c.req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        if (token && token !== 'anonymous') {
          c.set('clerkAuth', { userId: token });
        }
      }
      await next();
    },
    getAuth: (c: any) => c.get('clerkAuth'),
  };
});

// Import real routes
import { projectRoutes } from '../../routes/projects';
import { workflowRoutes } from '../../routes/workflows';
import { reportRoutes } from '../../routes/reports';
import { collaborationRoutes } from '../../routes/collaboration';
import { simulationRoutes } from '../../routes/simulation';
import { uxRoutes } from '../../routes/ux';

function createIntegrationApp() {
  const app = new Hono();
  
  app.use('*', clerkMiddleware());

  // Mount real route handlers under /api
  app.route('/api/projects', projectRoutes);
  app.route('/api/workflows', workflowRoutes);
  app.route('/api/reports', reportRoutes);
  app.route('/api/collaboration', collaborationRoutes);
  app.route('/api/simulation', simulationRoutes);
  app.route('/api/ux', uxRoutes);

  return app;
}

describe('Canonical End-to-End Integration Flow', () => {
  let app: Hono;

  beforeEach(async () => {
    app = createIntegrationApp();
    await resetDatabase();

    // 1. User Auth Bootstrapping
    await prisma.user.create({
      data: {
        id: integrationUser.id,
        email: integrationUser.email,
        name: integrationUser.name,
      },
    });

    mockLaunch.mockClear();
    mockCreateContext.mockClear();
  });

  it('should run the complete Fricta E2E backend integration flow successfully', async () => {
    const authHeaders = {
      'Authorization': `Bearer ${integrationUser.id}`,
      'Content-Type': 'application/json',
    };

    // 2. Create Project
    const createProjectRes = await app.request('/api/projects', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        projectName: integrationProject.projectName,
        websiteUrl: integrationProject.websiteUrl,
      }),
    });
    expect(createProjectRes.status).toBe(200);
    const { project } = await createProjectRes.json();
    expect(project.id).toBeDefined();
    expect(project.userId).toBe(integrationUser.id);

    // 3. Create & Start Workflow Session
    const startWorkflowRes = await app.request('/api/workflows/start', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        projectId: project.id,
        url: 'https://test-fricta.ai/welcome',
        goal: integrationWorkflow.goal,
        persona: integrationWorkflow.persona,
      }),
    });
    expect(startWorkflowRes.status).toBe(200);
    const { sessionId } = await startWorkflowRes.json();
    expect(sessionId).toBeDefined();

    // Verify workflow session is linked to project
    const sessionInDb = await prisma.workflowSession.findUnique({
      where: { id: sessionId },
    });
    expect(sessionInDb).not.toBeNull();
    expect(sessionInDb?.projectId).toBe(project.id);
    expect(sessionInDb?.status).toBe('RUNNING');

    // 4. Execute Telemetry Populate (simulate completed workflow session activities)
    const timeStart = new Date('2026-01-01T10:00:00Z');
    const timeHesitation = new Date('2026-01-01T10:00:25Z'); // 25s gap to trigger hesitation logic

    await prisma.agentAction.createMany({
      data: [
        {
          workflowSessionId: sessionId,
          action: 'fill',
          target: 'input#username',
          value: 'test_user',
          status: 'completed',
          stepNumber: 1,
          timestamp: timeStart,
        },
        {
          workflowSessionId: sessionId,
          action: 'click',
          target: 'button#submit',
          value: null,
          status: 'completed',
          stepNumber: 2,
          timestamp: timeHesitation,
        },
      ],
    });

    await prisma.agentThought.create({
      data: {
        workflowSessionId: sessionId,
        thought: 'I feel uncertain about which button is the primary submit.',
        stepNumber: 2,
        timestamp: timeHesitation,
      },
    });

    await prisma.workflowScreenshot.create({
      data: {
        workflowSessionId: sessionId,
        screenshotType: 'step',
        filePath: 'welcome_step1.webp',
        thumbnailPath: 'welcome_step1_thumb.webp',
        stepIndex: 1,
        pageUrl: 'https://test-fricta.ai/welcome',
        viewportWidth: 1280,
        viewportHeight: 720,
        fileSize: 1024,
      },
    });

    // Create SimulationProfile first to satisfy the BehavioralReplayEvent relation
    const profile = await prisma.simulationProfile.create({
      data: {
        projectId: project.id,
        name: 'Test Profile',
        personaType: 'BEGINNER',
        traits: {},
      },
    });

    // Populate behavioral replay event for replay checks
    const replayEvent = await prisma.behavioralReplayEvent.create({
      data: {
        workflowSessionId: sessionId,
        simulationProfileId: profile.id,
        stepIndex: 1,
        eventType: 'INPUT',
        durationMs: 1500,
        targetSelector: 'input#username',
      },
    });

    // 5. Generate and Verify Replay Retrieval
    const replayRes = await app.request(`/api/simulation/replay?sessionId=${sessionId}`, {
      headers: authHeaders,
    });
    expect(replayRes.status).toBe(200);
    const { events } = await replayRes.json();
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe(replayEvent.id);

    // 6. Generate Findings & Cognitive Signals via UX Intelligence Coordinator
    const analyzeRes = await app.request(`/api/ux/analyze/${sessionId}`, {
      method: 'POST',
      headers: authHeaders,
    });
    expect(analyzeRes.status).toBe(200);
    const analysisReport = await analyzeRes.json();
    expect(analysisReport.findings).toHaveLength(1);
    expect(analysisReport.cognitiveSignals).toBeDefined();

    // Verify findings are written to the database
    const findingsInDb = await prisma.uXFinding.findMany({
      where: { workflowSessionId: sessionId },
    });
    expect(findingsInDb).toHaveLength(1);
    const mainFinding = findingsInDb[0];
    expect(mainFinding.findingType).toBe('ONBOARDING_FRICTION');
    expect(mainFinding.severity).toBe('MEDIUM'); // 1 hesitation

    // 7. Create Investigation Thread Linked to Finding & Session
    const createInvestigationRes = await app.request('/api/collaboration/investigations', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        projectId: project.id,
        title: 'Investigate SignUp Hesitation',
        workflowSessionId: sessionId,
        uxFindingId: mainFinding.id,
      }),
    });
    expect(createInvestigationRes.status).toBe(200);
    const { thread } = await createInvestigationRes.json();
    expect(thread.id).toBeDefined();
    expect(thread.projectId).toBe(project.id);
    expect(thread.workflowSessionId).toBe(sessionId);

    // Verify investigation is stored in DB
    const threadInDb = await prisma.investigationThread.findUnique({
      where: { id: thread.id },
    });
    expect(threadInDb).not.toBeNull();
    expect(threadInDb?.title).toBe('Investigate SignUp Hesitation');

    // 8. Generate UX Report
    const generateReportRes = await app.request(`/api/reports/${sessionId}/generate`, {
      method: 'POST',
      headers: authHeaders,
    });
    expect(generateReportRes.status).toBe(200);
    const { success, reportData } = await generateReportRes.json();
    expect(success).toBe(true);
    expect(reportData).toBeDefined();

    // Verify UX report summary is created in DB
    const reportInDb = await prisma.uXReport.findFirst({
      where: { sessionId },
    });
    expect(reportInDb).not.toBeNull();
    expect(reportInDb?.score).toBeDefined();

    // 9. Export Report
    const exportRes = await app.request(`/api/reports/${sessionId}/export`, {
      headers: authHeaders,
    });
    expect(exportRes.status).toBe(200);
    const exports = await exportRes.json();
    expect(exports.markdown).toBeDefined();
    expect(exports.developerJson).toBeDefined();
  });
});
