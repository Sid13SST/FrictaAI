import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import { ExperimentManager } from '@fricta/optimization-intelligence/src/experiments';
import { HypothesisEngine } from '@fricta/optimization-intelligence/src/hypotheses';
import { ExperimentEvaluator } from '@fricta/optimization-intelligence/src/evaluation';
import { OutcomeRecorder } from '@fricta/optimization-intelligence/src/outcomes';
import { RecommendationTracker } from '@fricta/optimization-intelligence/src/recommendations';
import { OptimizationLearner } from '@fricta/optimization-intelligence/src/learning';
import { BaselineManager } from '@fricta/optimization-intelligence/src/baselines';
import { UXMetricsCollector } from '@fricta/optimization-intelligence/src/metrics';
import { ExperimentTimeline } from '@fricta/optimization-intelligence/src/timelines';
import { getCurrentUser } from '../middleware/authContext';
import { verifyProjectOwnership } from '../guards/ownership';

export const optimizationRoutes = new Hono();

// This file previously had ZERO ownership checks on any route — any
// authenticated user could read/mutate any other user's experiments,
// hypotheses, and recommendation-impact records by guessing an ID.
// `authorizeProject` is the non-bypassable baseline for projectId-scoped
// routes; `authorizeViaProjectId` resolves the owning project for routes
// that are only keyed by an experiment/hypothesis/impact id.
async function authorizeProject(c: any, projectId: string): Promise<Response | null> {
  const user = getCurrentUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const ownership = await verifyProjectOwnership(user.userId, projectId);
  if (ownership === 'NOT_FOUND') return c.json({ error: 'Project not found' }, 404);
  if (ownership !== 'OWNED') return c.json({ error: 'Forbidden: Insufficient privileges' }, 403);
  return null;
}

async function authorizeExperiment(c: any, experimentId: string): Promise<Response | null> {
  const experiment = await prisma.uXExperiment.findUnique({ where: { id: experimentId }, select: { projectId: true } });
  if (!experiment) return c.json({ error: 'Experiment not found' }, 404);
  return authorizeProject(c, experiment.projectId);
}

async function authorizeHypothesis(c: any, hypothesisId: string): Promise<Response | null> {
  const hypothesis = await prisma.optimizationHypothesis.findUnique({ where: { id: hypothesisId }, select: { projectId: true } });
  if (!hypothesis) return c.json({ error: 'Hypothesis not found' }, 404);
  return authorizeProject(c, hypothesis.projectId);
}

async function authorizeImpact(c: any, impactId: string): Promise<Response | null> {
  const impact = await prisma.recommendationImpact.findUnique({ where: { id: impactId }, select: { projectId: true } });
  if (!impact) return c.json({ error: 'Recommendation impact not found' }, 404);
  return authorizeProject(c, impact.projectId);
}

// ─── Experiments ──────────────────────────────────────────────────────────────

optimizationRoutes.get('/experiments', async (c) => {
  try {
    const projectId = c.req.query('projectId');
    if (!projectId) return c.json({ error: 'projectId required' }, 400);
    const denied = await authorizeProject(c, projectId);
    if (denied) return denied;

    const experiments = await ExperimentManager.listExperiments(projectId);
    return c.json({ experiments });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

optimizationRoutes.get('/experiments/:id', async (c) => {
  try {
    const denied = await authorizeExperiment(c, c.req.param('id'));
    if (denied) return denied;

    const experiment = await ExperimentManager.getExperiment(c.req.param('id'));
    if (!experiment) return c.json({ error: 'Not found' }, 404);
    return c.json({ experiment });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

optimizationRoutes.post('/experiments', async (c) => {
  try {
    const body = await c.req.json() as any;
    if (!body.projectId) return c.json({ error: 'projectId required' }, 400);
    const denied = await authorizeProject(c, body.projectId);
    if (denied) return denied;

    const experiment = await ExperimentManager.createExperiment(
      {
        projectId:            body.projectId,
        name:                 body.name,
        description:          body.description,
        targetMetric:         body.targetMetric,
        targetWorkflow:       body.targetWorkflow,
        evaluationWindowDays: body.evaluationWindowDays,
      },
      body.variants ?? []
    );

    // Auto-capture baselines on creation
    await UXMetricsCollector.collectBaseline(body.projectId, experiment.id);

    return c.json({ experiment }, 201);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

optimizationRoutes.post('/experiments/:id/activate', async (c) => {
  try {
    const denied = await authorizeExperiment(c, c.req.param('id'));
    if (denied) return denied;

    const experiment = await ExperimentManager.activateExperiment(c.req.param('id'));
    return c.json({ experiment });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

optimizationRoutes.post('/experiments/:id/evaluate', async (c) => {
  try {
    const id   = c.req.param('id');
    const denied = await authorizeExperiment(c, id);
    if (denied) return denied;

    const body = await c.req.json() as any;

    const experiment = await ExperimentManager.getExperiment(id);
    if (!experiment) return c.json({ error: 'Experiment not found' }, 404);

    // Run evaluation
    const currentMetrics = body.currentMetrics ?? {};
    const result = await ExperimentEvaluator.runEvaluation(id, currentMetrics);

    // Persist outcome
    const outcome = await OutcomeRecorder.record(experiment.projectId, id, result);

    // Conclude the experiment
    await ExperimentManager.concludeExperiment(id);

    // Store to organizational memory
    await OptimizationLearner.store(experiment.projectId, {
      memoryType:    result.conclusion === 'IMPROVED' ? 'SUCCESSFUL_PATTERN' : 'FAILED_PATTERN',
      patternKey:    experiment.targetMetric,
      patternSummary: `${experiment.name}: ${result.conclusion} (Δ ${result.deltaPercent.toFixed(1)}%)`,
      outcomeType:   result.conclusion === 'IMPROVED' ? 'SUCCESS' :
                     result.conclusion === 'REGRESSED' ? 'FAILURE' : 'PARTIAL',
      metricImpacted: experiment.targetMetric,
      deltaAchieved:  result.deltaPercent,
      experimentId:   id,
    });

    return c.json({ outcome, result });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

optimizationRoutes.get('/experiments/:id/timeline', async (c) => {
  try {
    const denied = await authorizeExperiment(c, c.req.param('id'));
    if (denied) return denied;

    const timeline = await ExperimentTimeline.getTimeline(c.req.param('id'));
    return c.json({ timeline });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// ─── Hypotheses ───────────────────────────────────────────────────────────────

optimizationRoutes.get('/hypotheses', async (c) => {
  try {
    const projectId = c.req.query('projectId');
    if (!projectId) return c.json({ error: 'projectId required' }, 400);
    const denied = await authorizeProject(c, projectId);
    if (denied) return denied;

    const hypotheses = await HypothesisEngine.listHypotheses(projectId);
    return c.json({ hypotheses });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

optimizationRoutes.post('/hypotheses', async (c) => {
  try {
    const body = await c.req.json() as any;
    if (!body.projectId) return c.json({ error: 'projectId required' }, 400);
    const denied = await authorizeProject(c, body.projectId);
    if (denied) return denied;

    const hypothesis = await HypothesisEngine.buildHypothesis({
      projectId:           body.projectId,
      experimentId:        body.experimentId,
      problemStatement:    body.problemStatement,
      supportingEvidence:  body.supportingEvidence ?? [],
      expectedImprovement: body.expectedImprovement,
      measurementStrategy: body.measurementStrategy,
      riskAssessment:      body.riskAssessment,
      evaluationWindowDays: body.evaluationWindowDays,
      successThreshold:    body.successThreshold,
    });
    return c.json({ hypothesis }, 201);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

optimizationRoutes.get('/hypotheses/:id/validate', async (c) => {
  try {
    const denied = await authorizeHypothesis(c, c.req.param('id'));
    if (denied) return denied;

    const missing = await HypothesisEngine.validateHypothesis(c.req.param('id'));
    return c.json({ valid: missing.length === 0, missingFields: missing });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// ─── Outcomes ─────────────────────────────────────────────────────────────────

optimizationRoutes.get('/outcomes', async (c) => {
  try {
    const projectId = c.req.query('projectId');
    if (!projectId) return c.json({ error: 'projectId required' }, 400);
    const denied = await authorizeProject(c, projectId);
    if (denied) return denied;

    const outcomes = await OutcomeRecorder.listOutcomes(projectId);
    return c.json({ outcomes });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// ─── Recommendation Impact ────────────────────────────────────────────────────

optimizationRoutes.get('/impact', async (c) => {
  try {
    const projectId = c.req.query('projectId');
    if (!projectId) return c.json({ error: 'projectId required' }, 400);
    const denied = await authorizeProject(c, projectId);
    if (denied) return denied;

    const impacts = await RecommendationTracker.list(projectId);
    return c.json({ impacts });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

optimizationRoutes.post('/impact', async (c) => {
  try {
    const body = await c.req.json() as any;
    if (!body.projectId) return c.json({ error: 'projectId required' }, 400);
    const denied = await authorizeProject(c, body.projectId);
    if (denied) return denied;

    const impact = await RecommendationTracker.trackAdoption(body.projectId, {
      recommendationType:   body.recommendationType,
      title:                body.title,
      description:          body.description,
      baselineSurvivability: body.baselineSurvivability,
      baselineFriction:      body.baselineFriction,
    });
    return c.json({ impact }, 201);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

optimizationRoutes.post('/impact/:id/adopt', async (c) => {
  try {
    const denied = await authorizeImpact(c, c.req.param('id'));
    if (denied) return denied;

    const body = await c.req.json() as any;
    const impact = await RecommendationTracker.markAdopted(
      c.req.param('id'),
      body.currentSurvivability,
      body.currentFriction
    );
    return c.json({ impact });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

optimizationRoutes.post('/impact/:id/verify', async (c) => {
  try {
    const denied = await authorizeImpact(c, c.req.param('id'));
    if (denied) return denied;

    const impact = await RecommendationTracker.verifyImpact(c.req.param('id'));
    return c.json({ impact });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// ─── Optimization Memory ──────────────────────────────────────────────────────

optimizationRoutes.get('/memory', async (c) => {
  try {
    const projectId = c.req.query('projectId');
    if (!projectId) return c.json({ error: 'projectId required' }, 400);
    const denied = await authorizeProject(c, projectId);
    if (denied) return denied;

    const memory  = await OptimizationLearner.list(projectId);
    const summary = await OptimizationLearner.summarize(projectId);
    return c.json({ memory, summary });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// ─── Baselines ────────────────────────────────────────────────────────────────

optimizationRoutes.get('/baselines', async (c) => {
  try {
    const projectId = c.req.query('projectId');
    if (!projectId) return c.json({ error: 'projectId required' }, 400);
    const denied = await authorizeProject(c, projectId);
    if (denied) return denied;

    const baselines = await BaselineManager.list(projectId);
    return c.json({ baselines });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});
