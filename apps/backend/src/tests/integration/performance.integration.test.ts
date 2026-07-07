import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import { resetDatabase, integrationUser } from './setup';
import { clerkMiddleware } from '@hono/clerk-auth';
import { createServer } from 'http';
import { promises as fs } from 'fs';
import * as path from 'path';
import { workflowQueue } from '@fricta/agent';

// Mock @fricta/agent to prevent launching Playwright/Chromium and starting real queue connections
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
        closeContext: vi.fn().mockResolvedValue(undefined),
      };
    }),
    SessionManager: vi.fn().mockImplementation(function() {
      return {
        start: vi.fn().mockResolvedValue(undefined),
        getContext: vi.fn().mockResolvedValue({ history: [] }),
        close: vi.fn().mockResolvedValue(undefined),
      };
    }),
    workflowQueue: {
      getJob: vi.fn().mockResolvedValue({
        id: 'job_123',
        getState: vi.fn().mockResolvedValue('completed'),
        data: { sessionId: 'session_123' }
      }),
      getJobCounts: vi.fn().mockResolvedValue({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0
      })
    }
  };
});

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

// Import real routes
import { projectRoutes } from '../../routes/projects';
import { workflowRoutes } from '../../routes/workflows';
import { reportRoutes } from '../../routes/reports';
import { simulationRoutes } from '../../routes/simulation';
import { uxRoutes } from '../../routes/ux';
import { requireAuth } from '../../middleware/clerkAuth';

function createIntegrationApp() {
  const app = new Hono();
  app.use('*', clerkMiddleware());

  const protectedApi = new Hono();
  protectedApi.use('*', requireAuth);
  protectedApi.route('/projects', projectRoutes);
  protectedApi.route('/workflows', workflowRoutes);
  protectedApi.route('/reports', reportRoutes);
  protectedApi.route('/simulation', simulationRoutes);
  protectedApi.route('/ux', uxRoutes);

  app.route('/api', protectedApi);
  return app;
}

describe('Performance & Scalability Baseline Validation', () => {
  let app: Hono;
  let targetServer: any;
  const dbQueries: { query: string; duration: number }[] = [];
  const testResults: any = {
    timestamp: new Date().toISOString(),
    environment: 'integration',
    baselines: [],
    concurrencySimulations: {},
    memoryTracking: {},
    queueMetrics: {},
    dbConnections: {},
  };

  beforeAll(async () => {
    // Start simple target HTTP server for Playwright to visit in less than 1ms
    targetServer = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body><h1>Fricta Performance Target</h1></body></html>');
    });
    await new Promise<void>((resolve) => targetServer.listen(3002, resolve));

    // Register Prisma middleware to log database query durations and frequencies
    prisma.$use(async (params, next) => {
      const start = performance.now();
      const result = await next(params);
      const duration = performance.now() - start;
      dbQueries.push({
        query: `${params.model || 'Global'}.${params.action}`,
        duration,
      });
      return result;
    });
  });

  afterAll(async () => {
    if (targetServer) {
      targetServer.close();
    }

    // Write structured performance results JSON file
    const dirPath = path.join(__dirname, '../../../test-results');
    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(
      path.join(dirPath, 'performance-report.json'),
      JSON.stringify(testResults, null, 2),
      'utf-8'
    );
  });

  beforeEach(async () => {
    app = createIntegrationApp();
    await resetDatabase();

    // Seed authenticated test user
    await prisma.user.create({
      data: {
        id: integrationUser.id,
        email: integrationUser.email,
        name: integrationUser.name,
      },
    });
  });

  const authHeaders = {
    'Authorization': `Bearer ${integrationUser.id}`,
    'Content-Type': 'application/json',
  };

  it('should run baseline performance inventory, concurrency simulations, queue tracking and memory validation', async () => {
    // ─── 1. Memory Before Test ──────────────────────────────────────────────
    const memBefore = process.memoryUsage();
    testResults.memoryTracking.before = {
      heapUsed: Math.round(memBefore.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memBefore.heapTotal / 1024 / 1024),
      rss: Math.round(memBefore.rss / 1024 / 1024),
      external: Math.round(memBefore.external / 1024 / 1024),
    };

    // ─── 2. Baseline API Response Times (Sequential Runs) ────────────────────
    const runs = 5;
    const projectCreationTimes: number[] = [];
    const workflowCreationTimes: number[] = [];
    const replayTimes: number[] = [];
    const reportGenTimes: number[] = [];
    const reportExportTimes: number[] = [];

    let lastSessionId = '';

    for (let i = 0; i < runs; i++) {
      // A. Project Creation
      const startProj = performance.now();
      const createProjectRes = await app.request('/api/projects', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          projectName: `Perf Project ${i}`,
          websiteUrl: 'http://localhost:3002',
        }),
      });
      const endProj = performance.now();
      projectCreationTimes.push(endProj - startProj);
      const { project } = await createProjectRes.json();
      expect(createProjectRes.status).toBe(200);

      // B. Workflow Session Creation (Starts browser context)
      const startWorkflow = performance.now();
      const startWorkflowRes = await app.request('/api/workflows/start', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          projectId: project.id,
          url: 'http://localhost:3002',
          goal: 'Measure baseline speed',
        }),
      });
      const endWorkflow = performance.now();
      workflowCreationTimes.push(endWorkflow - startWorkflow);
      const { sessionId } = await startWorkflowRes.json();
      expect(startWorkflowRes.status).toBe(200);
      lastSessionId = sessionId;

      // Create SimulationProfile first to satisfy the BehavioralReplayEvent relation
      const profile = await prisma.simulationProfile.create({
        data: {
          projectId: project.id,
          name: `Perf Profile ${i}`,
          personaType: 'BEGINNER',
          traits: {},
        },
      });

      // Seed replay event
      await prisma.behavioralReplayEvent.create({
        data: {
          workflowSessionId: sessionId,
          simulationProfileId: profile.id,
          stepIndex: 1,
          eventType: 'CLICK',
          durationMs: 500,
          targetSelector: 'button',
        },
      });

      // C. Replay Retrieval
      const startReplay = performance.now();
      const replayRes = await app.request(`/api/simulation/replay?sessionId=${sessionId}`, {
        headers: authHeaders,
      });
      const endReplay = performance.now();
      replayTimes.push(endReplay - startReplay);
      expect(replayRes.status).toBe(200);

      // D. Report Generation
      const startReportGen = performance.now();
      const reportGenRes = await app.request(`/api/reports/${sessionId}/generate`, {
        method: 'POST',
        headers: authHeaders,
      });
      const endReportGen = performance.now();
      reportGenTimes.push(endReportGen - startReportGen);
      expect(reportGenRes.status).toBe(200);

      // E. Report Export
      const startReportExport = performance.now();
      const reportExportRes = await app.request(`/api/reports/${sessionId}/export`, {
        headers: authHeaders,
      });
      const endReportExport = performance.now();
      reportExportTimes.push(endReportExport - startReportExport);
      expect(reportExportRes.status).toBe(200);

      // Clean up browser context for the run
      await app.request(`/api/workflows/${sessionId}/end`, {
        method: 'POST',
        headers: authHeaders,
      });
    }

    const calculateStats = (times: number[], name: string) => {
      const sorted = [...times].sort((a, b) => a - b);
      const avg = times.reduce((sum, val) => sum + val, 0) / times.length;
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
      const p99 = sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1];
      const max = sorted[sorted.length - 1];

      const baselineObj = {
        operation: name,
        averageMs: Math.round(avg),
        p95Ms: Math.round(p95),
        p99Ms: Math.round(p99),
        maxMs: Math.round(max),
      };
      testResults.baselines.push(baselineObj);
      return baselineObj;
    };

    console.log('\n=== Sequential Baseline Latencies ===');
    console.log(calculateStats(projectCreationTimes, 'createProject'));
    console.log(calculateStats(workflowCreationTimes, 'startWorkflow'));
    console.log(calculateStats(replayTimes, 'replayFetch'));
    console.log(calculateStats(reportGenTimes, 'generateReport'));
    console.log(calculateStats(reportExportTimes, 'exportReport'));

    // ─── 3. Concurrent User Simulation (1, 5, 10, 25 users) ──────────────────
    const concurrencyLevels = [1, 5, 10, 25];

    for (const level of concurrencyLevels) {
      // Pre-create a single project for replay query concurrency checks
      const seedProj = await prisma.project.create({
        data: {
          projectName: `Concurrency Project Target`,
          websiteUrl: 'http://localhost:3002',
          userId: integrationUser.id,
        },
      });

      const seedSession = await prisma.workflowSession.create({
        data: {
          projectId: seedProj.id,
          goal: 'Concurrency replay target',
          status: 'COMPLETED',
        },
      });

      const testRunStart = performance.now();
      let successCount = 0;
      let errorCount = 0;
      const responseTimes: number[] = [];

      const promises = Array.from({ length: level }).map(async (_, idx) => {
        // Each virtual user performs: Create Project -> Create Workflow -> Fetch Replay
        const userStart = performance.now();
        try {
          // Project Creation
          const projRes = await app.request('/api/projects', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              projectName: `Concurrent Project ${level}-${idx}`,
              websiteUrl: 'http://localhost:3002',
            }),
          });
          const { project } = await projRes.json();
          if (projRes.status !== 200) throw new Error('Failed project creation');

          // Workflow Creation
          const flowRes = await app.request('/api/workflows/start', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              projectId: project.id,
              url: 'http://localhost:3002',
              goal: `Concurrent run ${level}-${idx}`,
            }),
          });
          const { sessionId } = await flowRes.json();
          if (flowRes.status !== 200) throw new Error('Failed workflow start');

          // Replay Query
          const repRes = await app.request(`/api/simulation/replay?sessionId=${seedSession.id}`, {
            headers: authHeaders,
          });
          if (repRes.status !== 200) throw new Error('Failed replay query');

          // End the browser session immediately to free resources
          await app.request(`/api/workflows/${sessionId}/end`, {
            method: 'POST',
            headers: authHeaders,
          });

          successCount++;
          responseTimes.push(performance.now() - userStart);
        } catch (err) {
          errorCount++;
        }
      });

      await Promise.all(promises);
      const testRunDuration = performance.now() - testRunStart;

      // Calculate concurrency metrics
      const avgLatency = responseTimes.length > 0 
        ? responseTimes.reduce((sum, v) => sum + v, 0) / responseTimes.length 
        : 0;
      const sortedLatencies = [...responseTimes].sort((a, b) => a - b);
      const p95Latency = sortedLatencies.length > 0
        ? sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || sortedLatencies[sortedLatencies.length - 1]
        : 0;

      // Requests Per Second (RPS) computation
      // Each virtual user performs 3 distinct API calls (excluding /end)
      const totalRequests = level * 3;
      const requestsPerSecond = totalRequests / (testRunDuration / 1000);

      testResults.concurrencySimulations[`level_${level}`] = {
        concurrency: level,
        successRate: Math.round((successCount / level) * 100),
        errorRate: Math.round((errorCount / level) * 100),
        avgLatencyMs: Math.round(avgLatency),
        p95LatencyMs: Math.round(p95Latency),
        requestsPerSecond: Math.round(requestsPerSecond),
      };

      console.log(`\n=== Concurrency Level ${level} Results ===`);
      console.log(testResults.concurrencySimulations[`level_${level}`]);
    }

    // ─── 4. Memory After Test ───────────────────────────────────────────────
    const memAfter = process.memoryUsage();
    testResults.memoryTracking.after = {
      heapUsed: Math.round(memAfter.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memAfter.heapTotal / 1024 / 1024),
      rss: Math.round(memAfter.rss / 1024 / 1024),
      external: Math.round(memAfter.external / 1024 / 1024),
    };

    // ─── 5. Queue metrics tracking ───────────────────────────────────────────
    const counts = await workflowQueue.getJobCounts();
    testResults.queueMetrics = {
      pendingJobs: counts.waiting || 0,
      activeJobs: counts.active || 0,
      completedJobs: counts.completed || 0,
      failedJobs: counts.failed || 0,
    };

    console.log('\n=== Queue Metrics ===');
    console.log(testResults.queueMetrics);

    // ─── 6. Database Connection Pool and Metrics ─────────────────────────────
    // Analyze collected Prisma middleware metrics
    const queryReport: Record<string, { count: number; totalDuration: number }> = {};
    for (const log of dbQueries) {
      if (!queryReport[log.query]) {
        queryReport[log.query] = { count: 0, totalDuration: 0 };
      }
      queryReport[log.query].count++;
      queryReport[log.query].totalDuration += log.duration;
    }

    testResults.dbConnections = {
      totalQueriesExecuted: dbQueries.length,
      uniqueQueriesCount: Object.keys(queryReport).length,
      queries: Object.entries(queryReport).map(([q, val]) => ({
        query: q,
        frequency: val.count,
        avgDurationMs: Math.round(val.totalDuration / val.count),
      })).sort((a, b) => b.frequency - a.frequency),
    };

    console.log('\n=== Database Query Frequency & Latency ===');
    console.log(testResults.dbConnections.queries.slice(0, 10));

    // ─── 7. Memory After Cleanup ─────────────────────────────────────────────
    await resetDatabase();
    const memClean = process.memoryUsage();
    testResults.memoryTracking.afterCleanup = {
      heapUsed: Math.round(memClean.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memClean.heapTotal / 1024 / 1024),
      rss: Math.round(memClean.rss / 1024 / 1024),
      external: Math.round(memClean.external / 1024 / 1024),
    };

    console.log('\n=== Memory Footprint Tracking ===');
    console.log('Before:', testResults.memoryTracking.before);
    console.log('After:', testResults.memoryTracking.after);
    console.log('Cleanup:', testResults.memoryTracking.afterCleanup);
  }, 120000); // 120s timeout for complete concurrency test execution
});
