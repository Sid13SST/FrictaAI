import { PrismaClient } from './src/generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[SeedLiveIntelligence] Starting live intelligence database seed...');

  // 1. Get first project or create a mock project
  let project = await prisma.project.findFirst();
  if (!project) {
    console.log('[SeedLiveIntelligence] No project found, creating mock user and project...');
    const user = await prisma.user.create({
      data: {
        email: 'dev@fricta.ai',
        name: 'Developer Sandbox',
      },
    });

    project = await prisma.project.create({
      data: {
        userId: user.id,
        projectName: 'Sandbox Platform',
        websiteUrl: 'https://sandbox.fricta.ai',
      },
    });
  }

  const projectId = project.id;
  console.log(`[SeedLiveIntelligence] Using Project ID: ${projectId}`);

  // 2. Ensure mock sessions exist to link evidence
  let liveSession1 = await prisma.liveSession.findFirst({
    where: { sessionKey: 'fricta_sess_chrome_mac_usa_001' },
  });

  if (!liveSession1) {
    liveSession1 = await prisma.liveSession.create({
      data: {
        projectId,
        sessionKey: 'fricta_sess_chrome_mac_usa_001',
        browser: 'Chrome',
        os: 'macOS',
        device: 'Desktop',
        ipAddress: '64.233.160.1',
        location: 'San Francisco, USA',
        status: 'ACTIVE',
      },
    });
  }

  let liveSession2 = await prisma.liveSession.findFirst({
    where: { sessionKey: 'fricta_sess_firefox_win_uk_002' },
  });

  if (!liveSession2) {
    liveSession2 = await prisma.liveSession.create({
      data: {
        projectId,
        sessionKey: 'fricta_sess_firefox_win_uk_002',
        browser: 'Firefox',
        os: 'Windows',
        device: 'Desktop',
        ipAddress: '82.165.2.1',
        location: 'London, UK',
        status: 'ACTIVE',
      },
    });
  }

  // 3. Seed Production Baselines (expected metrics)
  const baselines = [
    { metric: 'rage_click_rate', val: 0.04, sd: 0.015 },
    { metric: 'script_error_rate', val: 0.02, sd: 0.01 },
    { metric: 'form_abandonment_rate', val: 0.15, sd: 0.04 },
    { metric: 'navigation_loop_rate', val: 0.05, sd: 0.02 },
    { metric: 'workflow_completion_rate', val: 0.85, sd: 0.05 },
    { metric: 'cognitive_friction_score', val: 0.11, sd: 0.03 },
  ];

  for (const b of baselines) {
    const existing = await prisma.productionBaseline.findFirst({
      where: { projectId, metricName: b.metric, scopeKey: 'v1.0.0' },
    });

    if (!existing) {
      await prisma.productionBaseline.create({
        data: {
          projectId,
          baselineType: 'VERSION',
          scopeKey: 'v1.0.0',
          metricName: b.metric,
          expectedValue: b.val,
          standardDeviation: b.sd,
        },
      });
    }
  }

  // 4. Seed Survivability Metrics
  const survivabilityMetrics = [
    { type: 'ONBOARDING_SURVIVABILITY', val: 0.88, workflow: 'onboarding' },
    { type: 'CTA_SURVIVABILITY', val: 0.96, workflow: 'primary-cta' },
    { type: 'NAVIGATION_SURVIVABILITY', val: 0.94, workflow: 'routing' },
    { type: 'WORKFLOW_SURVIVABILITY', val: 0.82, workflow: 'checkout' },
    { type: 'COGNITIVE_SURVIVABILITY', val: 0.89, workflow: 'cognitive' },
  ];

  for (const sm of survivabilityMetrics) {
    await prisma.survivabilityMetric.create({
      data: {
        projectId,
        metricType: sm.type,
        value: sm.val,
        targetWorkflow: sm.workflow,
      },
    });
  }

  // 5. Seed active UX Anomalies
  // Anomaly 1: Rage Clicks Spike
  const anomaly1 = await prisma.uXAnomaly.create({
    data: {
      projectId,
      anomalyType: 'RAGE_CLICK_SPIKE',
      severity: 'CRITICAL',
      description: 'Rage Click Spike detected: 42.1% of active sessions experienced user clicks loops on unresponsive UI components, exceeding the normal baseline threshold of 4.0%.',
      isResolved: false,
    },
  });

  await prisma.anomalyEvidence.create({
    data: {
      anomalyId: anomaly1.id,
      liveSessionId: liveSession1.id,
      evidenceType: 'RAGE_CLICK_COUNT',
      details: {
        target: 'button#confirm-checkout',
        clickCount: 12,
        durationSeconds: 15,
      },
    },
  });

  await prisma.correlatedBehavior.create({
    data: {
      anomalyId: anomaly1.id,
      correlationType: 'VERSION',
      correlationKey: 'os:macOS',
      coefficient: 0.9,
      evidenceDetails: '90% of anomalous user sessions were on macOS (total contributing: 1/1).',
    },
  });

  // Anomaly 2: Form Abandonment Surge
  const anomaly2 = await prisma.uXAnomaly.create({
    data: {
      projectId,
      anomalyType: 'FORM_ABANDONMENT_SURGE',
      severity: 'HIGH',
      description: 'Form Abandonment Surge detected: 28.5% of users who engaged with form fields exited the funnel prematurely, with most drop-offs clustering on field selector "input#billing-zip".',
      isResolved: false,
    },
  });

  await prisma.anomalyEvidence.create({
    data: {
      anomalyId: anomaly2.id,
      liveSessionId: liveSession2.id,
      evidenceType: 'FAILED_CTA',
      details: {
        target: 'input#billing-zip',
        lastInteractedAction: 'INPUT',
      },
    },
  });

  await prisma.correlatedBehavior.create({
    data: {
      anomalyId: anomaly2.id,
      correlationType: 'SESSION',
      correlationKey: 'browser:Firefox',
      coefficient: 1.0,
      evidenceDetails: '100% of anomalous user sessions were on browser Firefox (total contributing: 1/1).',
    },
  });

  // 6. Seed Alerts
  await prisma.intelligenceAlert.create({
    data: {
      projectId,
      alertType: 'FRICTION_ESCALATION',
      title: 'UX Incident: RAGE_CLICK_SPIKE',
      message: 'Rage Click Spike detected: 42.1% of active sessions experienced user clicks loops on unresponsive UI components, exceeding the normal baseline threshold of 4.0%.',
      severity: 'CRITICAL',
      isRead: false,
    },
  });

  await prisma.intelligenceAlert.create({
    data: {
      projectId,
      alertType: 'ABANDONMENT_ESCALATION',
      title: 'UX Incident: FORM_ABANDONMENT_SURGE',
      message: 'Form Abandonment Surge detected: 28.5% of users who engaged with form fields exited the funnel prematurely.',
      severity: 'HIGH',
      isRead: false,
    },
  });

  // 7. Seed Behavioral Patterns
  await prisma.behavioralPattern.create({
    data: {
      projectId,
      patternType: 'RAGE_CLICK_LOOP',
      description: 'Repetitive user clicking on checkout button (button#confirm-checkout)',
      confidence: 0.94,
      sessionCount: 3,
    },
  });

  await prisma.behavioralPattern.create({
    data: {
      projectId,
      patternType: 'ABANDONMENT_PATH',
      description: 'Users dropping off at /checkout after entering incomplete billing inputs',
      confidence: 0.88,
      sessionCount: 2,
    },
  });

  console.log('[SeedLiveIntelligence] Database seed completed successfully.');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('[SeedLiveIntelligence] Seeding failed:', err);
  prisma.$disconnect();
  process.exit(1);
});
