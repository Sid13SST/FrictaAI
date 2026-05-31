import { PrismaClient } from './src/generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Outcome Intelligence & KPI Operating Layer database seeding...');

  // 1. Get or create user
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'admin@fricta.ai',
        name: 'Fricta Admin',
      },
    });
    console.log(`Created admin user: ${user.email}`);
  }

  // 2. Get or create project
  let project = await prisma.project.findFirst();
  if (!project) {
    project = await prisma.project.create({
      data: {
        userId: user.id,
        projectName: 'Fricta Core App',
        websiteUrl: 'https://app.fricta.ai',
      },
    });
    console.log(`Created default project: ${project.projectName}`);
  }

  // Clear any existing outcome-intelligence data for this project to prevent duplicates
  await prisma.initiativeImpact.deleteMany({ where: { outcome: { projectId: project.id } } }).catch(() => {});
  await prisma.outcomeEvidence.deleteMany({ where: { outcome: { projectId: project.id } } }).catch(() => {});
  await prisma.productOutcome.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.kPIHistory.deleteMany({ where: { kpi: { projectId: project.id } } }).catch(() => {});
  await prisma.kPIForecast.deleteMany({ where: { kpi: { projectId: project.id } } }).catch(() => {});
  await prisma.outcomeBaseline.deleteMany({ where: { kpi: { projectId: project.id } } }).catch(() => {});
  await prisma.productKPI.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.productHealthScore.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.productInitiative.deleteMany({ where: { projectId: project.id } }).catch(() => {});

  // 3. Seed Initiatives
  const onboardingInitiative = await prisma.productInitiative.create({
    data: {
      projectId: project.id,
      title: 'Onboarding Flow Redesign v2',
      description: 'Streamline the registration and team creation workflow to reduce dropoffs.',
      owner: 'Sarah Jenkins',
      status: 'APPROVED',
      strategicScore: 88,
      userImpactScore: 92,
      survivabilityScore: 85,
      riskScore: 30,
      effortScore: 4.0,
      complexity: 'MEDIUM',
      targetQuarter: '2026-Q3',
    },
  });
  console.log(`Seeded Initiative: ${onboardingInitiative.title}`);

  // 4. Seed KPIs
  const kpisData = [
    { name: 'User Retention (D30)', description: 'Percentage of users returning after 30 days', type: 'RETENTION', key: 'd30_retention', target: 65.0, current: 58.0 },
    { name: 'Onboarding Activation', description: 'Percentage of signed up users completing setup', type: 'ACTIVATION', key: 'onboarding_activation', target: 80.0, current: 72.0 },
    { name: 'Onboarding Abandonment', description: 'User abandonment rate within the onboarding steps', type: 'COMPLETION', key: 'onboarding_abandonment_friction', target: 15.0, current: 18.0 },
    { name: 'Core Task Completion', description: 'Successful execution of main workspace flows', type: 'COMPLETION', key: 'task_completion_rate', target: 95.0, current: 91.0 },
    { name: 'UX Survivability Rating', description: 'Aggregated error-free session rate', type: 'SURVIVABILITY', key: 'survivability_rate', target: 90.0, current: 86.5 }
  ];

  const seededKPIs = [];
  for (const kpiData of kpisData) {
    const kpi = await prisma.productKPI.create({
      data: {
        projectId: project.id,
        name: kpiData.name,
        description: kpiData.description,
        kpiType: kpiData.type,
        metricKey: kpiData.key,
        currentValue: kpiData.current,
        targetValue: kpiData.target,
        owner: 'Sarah Jenkins',
        status: 'ACTIVE',
      }
    });

    // Seed Histories (5 points)
    const baseValue = kpiData.current - 5;
    for (let i = 0; i < 5; i++) {
      const val = baseValue + i * 1.25;
      await prisma.kPIHistory.create({
        data: {
          kpiId: kpi.id,
          value: val,
          recordedAt: new Date(Date.now() - (5 - i) * 24 * 60 * 60 * 1000)
        }
      });
    }

    // Seed Baseline
    await prisma.outcomeBaseline.create({
      data: {
        kpiId: kpi.id,
        value: baseValue,
        windowStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        windowEnd: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      }
    });

    // Seed Forecast
    await prisma.kPIForecast.create({
      data: {
        kpiId: kpi.id,
        projectedValue: kpiData.target,
        confidenceLower: kpiData.target - 3,
        confidenceUpper: kpiData.target + 3,
        targetQuarter: '2026-Q3'
      }
    });

    seededKPIs.push(kpi);
    console.log(`Seeded KPI: ${kpi.name}`);
  }

  // 5. Seed Outcome Evaluations (Advisory-Only attribution details)
  const onboardingOutcome = await prisma.productOutcome.create({
    data: {
      projectId: project.id,
      initiativeId: onboardingInitiative.id,
      title: 'Onboarding Redesign Impact Assessment',
      description: `Strong correlation detected.\n\nThe onboarding redesign was followed by:\n- +12% retention\n- +18% activation\n- reduced onboarding abandonment\n\nConfidence: High\nEvidence: Supported by 1,842 sessions`,
      verdict: 'POSITIVE'
    }
  });

  // Seed Evidence
  const mockReplay = await prisma.workflowSession.findFirst({ where: { projectId: project.id } });
  const mockAnomaly = await prisma.uXAnomaly.findFirst({ where: { projectId: project.id } });

  const evidenceData = [
    { type: 'REPLAY', ref: mockReplay?.id || 'session-uuid-1', desc: 'Pre-redesign user session showing rage clicks on step 2 registration form.' },
    { type: 'ANOMALY', ref: mockAnomaly?.id || 'anomaly-uuid-1', desc: 'Resolved onboarding step latency spike anomaly.' }
  ];

  for (const ev of evidenceData) {
    await prisma.outcomeEvidence.create({
      data: {
        outcomeId: onboardingOutcome.id,
        evidenceType: ev.type,
        referenceId: ev.ref,
        description: ev.desc
      }
    });
  }

  // Seed Initiative Impacts
  const retentionKpi = seededKPIs.find(k => k.kpiType === 'RETENTION');
  const activationKpi = seededKPIs.find(k => k.kpiType === 'ACTIVATION');
  const abandonmentKpi = seededKPIs.find(k => k.metricKey === 'onboarding_abandonment_friction');

  if (retentionKpi) {
    await prisma.initiativeImpact.create({
      data: {
        outcomeId: onboardingOutcome.id,
        kpiId: retentionKpi.id,
        correlationValue: 0.82,
        baselineValue: 46.0,
        postValue: 58.0,
        deltaPercent: 12.0,
        contributionAnalysis: 'Retention increased by 12%. Pre-redesign baseline: 46%, current: 58%. strong correlation with reduced signup friction.',
        verified: true
      }
    });
  }

  if (activationKpi) {
    await prisma.initiativeImpact.create({
      data: {
        outcomeId: onboardingOutcome.id,
        kpiId: activationKpi.id,
        correlationValue: 0.89,
        baselineValue: 54.0,
        postValue: 72.0,
        deltaPercent: 18.0,
        contributionAnalysis: 'Activation rates improved by 18%. Strong alignment with onboarding redesign telemetry trends.',
        verified: true
      }
    });
  }

  if (abandonmentKpi) {
    await prisma.initiativeImpact.create({
      data: {
        outcomeId: onboardingOutcome.id,
        kpiId: abandonmentKpi.id,
        correlationValue: 0.76,
        baselineValue: 24.0,
        postValue: 18.0,
        deltaPercent: -25.0, // abandonment dropped from 24% to 18% (which is a 25% drop relative to base)
        contributionAnalysis: 'Onboarding abandonment decreased, showing high correlation with form layout refinements.',
        verified: true
      }
    });
  }

  // 6. Seed ProductHealthScore history
  for (let idx = 0; idx < 10; idx++) {
    await prisma.productHealthScore.create({
      data: {
        projectId: project.id,
        productScore: 75.0 + idx * 1.2,
        uxScore: 80.0 + idx * 0.8,
        strategicScore: 70.0 + idx * 1.5,
        recordedAt: new Date(Date.now() - (10 - idx) * 3 * 24 * 60 * 60 * 1000)
      }
    });
  }

  console.log('✅ Outcome Intelligence & KPI Operating Layer seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
