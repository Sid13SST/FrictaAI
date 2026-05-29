import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import {
  DeploymentOrchestrator,
  PreviewIntelligence,
  CiIntelligenceEngine,
  RegressionEngine,
  PullRequestIntelligenceManager,
  ReleaseManager,
  EngineeringObservability
} from '@fricta/integration-core';

export const engineeringRoutes = new Hono();

/**
 * POST /api/ci/replays
 * Triggers or records a replay run inside a CI pipeline.
 */
engineeringRoutes.post('/ci/replays', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { projectId, workflowPath, branch, commitHash, provider, buildId, author, commitMessage } = body;

  if (!projectId || !workflowPath || !branch || !commitHash) {
    return c.json({ error: 'projectId, workflowPath, branch, and commitHash are required' }, 400);
  }

  // 1. Create or resolve a deployment run
  let run = await prisma.deploymentRun.findFirst({
    where: { projectId, commitHash }
  });

  if (!run) {
    run = await DeploymentOrchestrator.createDeploymentRun(projectId, {
      commitHash,
      branch,
      environment: branch === 'main' ? 'production' : 'preview',
      deploymentUrl: body.deploymentUrl || null,
      provider: provider || 'GITHUB_ACTIONS'
    });
  }

  if (!run) {
    return c.json({ error: 'Failed to resolve deployment run' }, 500);
  }

  // Associate build correlation
  if (buildId) {
    await prisma.buildCorrelation.create({
      data: {
        deploymentRunId: run.id,
        buildId,
        jobId: body.jobId || null,
        commitMessage: commitMessage || null,
        author: author || null,
        duration: body.duration || null,
        logUrl: body.logUrl || null
      }
    });
  }

  // 2. Start a replay execution
  const exec = await CiIntelligenceEngine.startReplayExecution(run.id, workflowPath);

  // 3. Simulate replay run completion (in dev / local mode)
  // Generating mock session metrics
  const mockSurvivability = Math.floor(Math.random() * 40) + 60; // 60 - 100
  const mockCognitive = Math.floor(Math.random() * 30) + 30; // 30 - 60
  const mockFriction = parseFloat((Math.random() * 0.5).toFixed(2));
  const mockSteps = Math.floor(Math.random() * 5) + 4; // 4 - 8

  // Create a mock workflow session to link
  const session = await prisma.workflowSession.create({
    data: {
      projectId,
      goal: `CI Verification check: ${workflowPath}`,
      persona: 'STANDARD',
      status: 'COMPLETED',
      stepCount: mockSteps,
      startedAt: new Date(),
      endedAt: new Date()
    }
  });

  const completedExec = await CiIntelligenceEngine.completeReplayExecution(exec.id, {
    workflowSessionId: session.id,
    survivabilityRate: mockSurvivability,
    cognitiveLoad: mockCognitive,
    frictionScore: mockFriction,
    stepsCompleted: mockSteps
  });

  // 4. Run regression checks
  await RegressionEngine.analyzeRegressions(run.id, workflowPath, {
    survivabilityRate: mockSurvivability,
    cognitiveLoad: mockCognitive,
    frictionScore: mockFriction,
    steps: mockSteps
  });

  // 5. Update overall deployment status & metrics
  await DeploymentOrchestrator.updateDeploymentStatus(run.id, 'COMPLETED', {
    survivabilityScore: mockSurvivability,
    riskLevel: mockSurvivability < 70 ? 'HIGH' : mockSurvivability < 85 ? 'MEDIUM' : 'LOW'
  });

  return c.json({
    message: 'CI Replay check executed',
    execution: completedExec,
    session
  });
});

/**
 * GET /api/ci/regressions
 * Returns list of regression analyses for the project.
 */
engineeringRoutes.get('/ci/regressions', async (c) => {
  const projectId = c.req.query('projectId');
  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }

  const regressions = await prisma.regressionAnalysis.findMany({
    where: {
      deploymentRun: { projectId }
    },
    include: {
      deploymentRun: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return c.json({ regressions });
});

/**
 * POST /api/deployments/previews
 * Register a preview environment.
 */
engineeringRoutes.post('/deployments/previews', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { deploymentRunId, provider, url, branch, prNumber } = body;

  if (!deploymentRunId || !provider || !url || !branch) {
    return c.json({ error: 'deploymentRunId, provider, url, and branch are required' }, 400);
  }

  const preview = await PreviewIntelligence.registerPreview(
    deploymentRunId,
    provider,
    url,
    branch,
    prNumber
  );

  return c.json({ message: 'Preview registered', preview });
});

/**
 * GET /api/deployments/previews
 * Returns previews list.
 */
engineeringRoutes.get('/deployments/previews', async (c) => {
  const projectId = c.req.query('projectId');
  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }

  const previews = await prisma.previewEnvironment.findMany({
    where: {
      deploymentRun: { projectId }
    },
    include: {
      deploymentRun: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return c.json({ previews });
});

/**
 * POST /api/deployments/releases
 * Logs a production release event.
 */
engineeringRoutes.post('/deployments/releases', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { deploymentRunId, title, description } = body;

  if (!deploymentRunId || !title || !description) {
    return c.json({ error: 'deploymentRunId, title, and description are required' }, 400);
  }

  const event = await ReleaseManager.logReleaseEvent(deploymentRunId, title, description);
  return c.json({ message: 'Release event logged', event });
});

/**
 * GET /api/deployments/releases
 * Returns release timeline.
 */
engineeringRoutes.get('/deployments/releases', async (c) => {
  const projectId = c.req.query('projectId');
  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }

  const events = await ReleaseManager.getTimelineEvents(projectId);
  return c.json({ events });
});

/**
 * POST /api/pull-requests/intelligence
 * Registers pull request intelligence and generates the summary comment.
 */
engineeringRoutes.post('/pull-requests/intelligence', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { deploymentRunId, prNumber, prTitle, sourceBranch, targetBranch } = body;

  if (!deploymentRunId || !prNumber || !prTitle || !sourceBranch || !targetBranch) {
    return c.json({ error: 'deploymentRunId, prNumber, prTitle, sourceBranch, and targetBranch are required' }, 400);
  }

  const intelligence = await PullRequestIntelligenceManager.syncPullRequestIntelligence(
    deploymentRunId,
    { prNumber, prTitle, sourceBranch, targetBranch }
  );

  return c.json({ message: 'PR intelligence generated', intelligence });
});

/**
 * GET /api/pull-requests/intelligence
 * Returns list of PR summaries.
 */
engineeringRoutes.get('/pull-requests/intelligence', async (c) => {
  const projectId = c.req.query('projectId');
  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }

  const intells = await prisma.pullRequestIntelligence.findMany({
    where: {
      deploymentRun: { projectId }
    },
    include: {
      deploymentRun: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return c.json({ intelligence: intells });
});

/**
 * GET /api/engineering/risk
 * Returns active risk monitoring indicators.
 */
engineeringRoutes.get('/engineering/risk', async (c) => {
  const projectId = c.req.query('projectId');
  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }

  const signals = await prisma.deploymentRiskSignal.findMany({
    where: {
      deploymentRun: { projectId }
    },
    include: {
      deploymentRun: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return c.json({ signals });
});

/**
 * GET /api/engineering/observability
 * Returns build correlation lists and release timelines.
 */
engineeringRoutes.get('/engineering/observability', async (c) => {
  const projectId = c.req.query('projectId');
  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }

  const summary = await EngineeringObservability.getObservabilitySummary(projectId);
  return c.json({ summary });
});
