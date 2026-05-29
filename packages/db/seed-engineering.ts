import { prisma } from './src';
import {
  DeploymentOrchestrator,
  PreviewIntelligence,
  CiIntelligenceEngine,
  RegressionEngine,
  PullRequestIntelligenceManager,
  ReleaseManager
} from '../integration-core/src';

async function seed() {
  console.log('--- Starting Engineering Integration Seeding ---');

  // 1. Ensure user and project exist
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({ data: { email: 'founder@fricta.ai', name: 'Fricta Founder' } });
  }

  let project = await prisma.project.findFirst({ where: { userId: user.id } });
  if (!project) {
    project = await prisma.project.create({
      data: { userId: user.id, projectName: 'Fricta Core App', websiteUrl: 'https://fricta.ai' }
    });
  }

  console.log(`Using user: ${user.email}, project: ${project.projectName} (${project.id})`);

  // 2. Ensure a historical baseline exists for comparison
  console.log('Upserting historical baseline...');
  const baseline = await prisma.historicalBaseline.create({
    data: {
      projectId: project.id,
      name: 'Release Baseline v1.2',
      workflowPath: '/onboarding',
      averageSteps: 6.0,
      averageFriction: 0.15,
      successRate: 90.0,
      cognitiveLoadAverage: 35.0,
      sampleSize: 100
    }
  });
  console.log(`  ✓ Baseline created: ${baseline.name}`);

  // 3. Create active production release deployment run
  console.log('Seeding production release deployment...');
  const prodRun = await DeploymentOrchestrator.createDeploymentRun(project.id, {
    commitHash: 'a5c7f81b2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a',
    branch: 'main',
    environment: 'production',
    deploymentUrl: 'https://fricta-app.vercel.app',
    provider: 'VERCEL',
    metadata: {
      vercelDeploymentId: 'dpl_prod_fricta_001',
      siteName: 'fricta-app',
      creator: 'fricta-founder'
    }
  });

  await prisma.buildCorrelation.create({
    data: {
      deploymentRunId: prodRun.id,
      buildId: 'gh-build-77421',
      jobId: 'job-1',
      commitMessage: 'release: ship initial v1.2 onboarding flow stability improvements',
      author: 'fricta-founder',
      duration: 320,
      logUrl: 'https://github.com/fricta-ai/fricta/actions/runs/77421'
    }
  });

  // Complete prod deploy
  await DeploymentOrchestrator.updateDeploymentStatus(prodRun.id, 'COMPLETED', {
    survivabilityScore: 92.5,
    riskLevel: 'LOW'
  });

  // 4. Create active preview deployment run (e.g. from pull request #45)
  console.log('Seeding preview environment deployment...');
  const prevRun = await DeploymentOrchestrator.createDeploymentRun(project.id, {
    commitHash: 'f4d3c2b1a0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5',
    branch: 'feature/streamlined-onboarding',
    environment: 'preview',
    deploymentUrl: 'https://fricta-app-git-streamlined-onboarding.vercel.app',
    provider: 'VERCEL',
    metadata: {
      vercelDeploymentId: 'dpl_prev_fricta_002',
      siteName: 'fricta-app-preview',
      creator: 'fricta-engineer'
    }
  });

  await prisma.buildCorrelation.create({
    data: {
      deploymentRunId: prevRun.id,
      buildId: 'gh-build-77495',
      jobId: 'job-1',
      commitMessage: 'feat: restructure checkout progressive disclosure to reduce overload',
      author: 'fricta-engineer',
      duration: 210,
      logUrl: 'https://github.com/fricta-ai/fricta/actions/runs/77495'
    }
  });

  // Register preview environment details
  const preview = await PreviewIntelligence.registerPreview(
    prevRun.id,
    'VERCEL',
    'https://fricta-app-git-streamlined-onboarding.vercel.app',
    'feature/streamlined-onboarding',
    '45'
  );
  console.log(`  ✓ Preview environment registered: ${preview.url}`);

  // Create replay execution inside CI for this preview
  const exec = await CiIntelligenceEngine.startReplayExecution(prevRun.id, '/onboarding');

  // Complete CI Replay Execution with metrics that trigger a regression check
  // Survivability fell from 90% (baseline) -> 72.0%
  // Cognitive load spiked from 35.0% (baseline) -> 65.0%
  await CiIntelligenceEngine.completeReplayExecution(exec.id, {
    survivabilityRate: 72.0,
    cognitiveLoad: 65.0,
    frictionScore: 0.42,
    stepsCompleted: 8,
    errorMessage: undefined
  });

  // Trigger regression engine to log the regression and flags
  console.log('Analyzing regressions for preview deployment...');
  await RegressionEngine.analyzeRegressions(prevRun.id, '/onboarding', {
    survivabilityRate: 72.0,
    cognitiveLoad: 65.0,
    frictionScore: 0.42,
    steps: 8
  });

  // Sync PR intelligence for GitHub Pull Request #45
  console.log('Generating PR intelligence details...');
  const prIntel = await PullRequestIntelligenceManager.syncPullRequestIntelligence(
    prevRun.id,
    {
      prNumber: '45',
      prTitle: 'Streamline onboarding layout with progressive disclosure',
      sourceBranch: 'feature/streamlined-onboarding',
      targetBranch: 'main'
    }
  );
  console.log(`  ✓ PR intelligence generated (Risk Score: ${prIntel.riskScore}/100)`);

  // Log timeline events
  await ReleaseManager.logReleaseEvent(prevRun.id, 'Commit Pushed', 'fricta-engineer pushed commit f4d3c2b1 to branch feature/streamlined-onboarding');
  await ReleaseManager.logReleaseEvent(prevRun.id, 'Vercel Preview Deployed', 'Deployment available at https://fricta-app-git-streamlined-onboarding.vercel.app');

  // Update status of preview run to completed but with high risk
  await DeploymentOrchestrator.updateDeploymentStatus(prevRun.id, 'COMPLETED', {
    survivabilityScore: 72.0,
    riskLevel: 'HIGH'
  });

  // 5. Verification checks
  console.log('\nVerifying database records...');
  const [runsCount, execCount, prevCount, prCount, regCount, riskCount, buildCount, timelineCount] = await Promise.all([
    prisma.deploymentRun.count(),
    prisma.replayExecution.count(),
    prisma.previewEnvironment.count(),
    prisma.pullRequestIntelligence.count(),
    prisma.regressionAnalysis.count(),
    prisma.deploymentRiskSignal.count(),
    prisma.buildCorrelation.count(),
    prisma.releaseTimelineEvent.count()
  ]);

  console.log(`Verification Metrics:`);
  console.log(`- Deployment Runs:       ${runsCount}`);
  console.log(`- Replay Executions:     ${execCount}`);
  console.log(`- Preview Environments:  ${prevCount}`);
  console.log(`- PR Intelligences:      ${prCount}`);
  console.log(`- Regressions:           ${regCount}`);
  console.log(`- Risk Signals:          ${riskCount}`);
  console.log(`- Build Correlations:    ${buildCount}`);
  console.log(`- Release Timeline Events:${timelineCount}`);
  console.log('--- Engineering Integration Seeding Complete ---');
}

seed()
  .catch(err => { console.error('Seeding failed:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
