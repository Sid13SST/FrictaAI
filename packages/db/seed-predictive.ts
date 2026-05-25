import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Predictive UX Intelligence Engine records...');

  // 1. Resolve project
  const project = await prisma.project.findFirst();
  if (!project) {
    console.error('No project found. Run seed-workspace.ts or seed-simulation.ts first.');
    process.exit(1);
  }

  // Clear existing predictive records to prevent duplicate seeding issues
  await prisma.historicalBaseline.deleteMany({ where: { projectId: project.id } });
  await prisma.workflowForecast.deleteMany({ where: { projectId: project.id } });
  await prisma.regressionEvent.deleteMany({ where: { projectId: project.id } });

  // 2. Create Historical Baseline
  const baseline = await prisma.historicalBaseline.create({
    data: {
      projectId: project.id,
      name: 'V1.0 System Baseline',
      workflowPath: 'https://sandbox.fricta.ai/checkout',
      averageSteps: 4.1,
      averageFriction: 0.32,
      successRate: 0.85,
      cognitiveLoadAverage: 0.38,
      sampleSize: 10,
    },
  });

  console.log(`Created Baseline: ${baseline.id} for Project: ${project.projectName}`);

  // 3. Create WorkflowForecast
  const forecast = await prisma.workflowForecast.create({
    data: {
      projectId: project.id,
      workflowPath: 'https://sandbox.fricta.ai/checkout',
      status: 'COMPLETED',
      stabilityScore: 0.58,
      completionRate: 0.72,
      averageFriction: 0.44,
      failureClusterPoints: ['input#password', 'div.sidebar-banner'],
      riskLevel: 'HIGH',
      createdAt: new Date(),
    },
  });

  console.log(`Created Forecast: ${forecast.id} with risk: HIGH`);

  // 4. Create PredictiveRiskSignals
  const risks = [
    {
      stepIndex: 4,
      riskType: 'WORKFLOW_COLLAPSE',
      confidenceScore: 0.82,
      severity: 'HIGH',
      targetSelector: 'button[type="submit"]',
      contributingSignals: ['Low historical success rate', 'High latency on confirmation CTA'],
      evidenceNotes: 'Predictive models suggest a 28% chance of workflow collapse at the submission step based on historical drop-offs.',
      historicalBasis: 'Prior user sessions show repetitive failure clusters around submit button actioning.',
    },
    {
      stepIndex: 0,
      riskType: 'ONBOARDING_FAILURE',
      confidenceScore: 0.74,
      severity: 'MEDIUM',
      targetSelector: 'input[name="email"]',
      contributingSignals: ['Required validation hurdles', 'High hesitation on signup inputs'],
      evidenceNotes: 'Complexity in initial form inputs is expected to trigger early-stage hesitation loops.',
      historicalBasis: 'Distracted and beginner personas show delayed typing events during email and password configuration.',
    },
    {
      stepIndex: 2,
      riskType: 'CTA_WEAKNESS',
      confidenceScore: 0.88,
      severity: 'HIGH',
      targetSelector: 'div.sidebar-banner',
      contributingSignals: ['Low visual prominence', 'Low contrast weight'],
      evidenceNotes: 'The selector "div.sidebar-banner" possesses low discoverability coefficients.',
      historicalBasis: 'Visual attention heatmap logs show users repeatedly scan past this option without interacting.',
    },
  ];

  for (const r of risks) {
    await prisma.predictiveRiskSignal.create({
      data: {
        workflowForecastId: forecast.id,
        stepIndex: r.stepIndex,
        riskType: r.riskType,
        confidenceScore: r.confidenceScore,
        severity: r.severity,
        targetSelector: r.targetSelector,
        contributingSignals: r.contributingSignals as any,
        evidenceNotes: r.evidenceNotes,
        historicalBasis: r.historicalBasis,
      },
    });
  }

  // 5. Create RegressionEvents
  const regressions = [
    {
      metricName: 'COMPLETION_RATE',
      baseValue: 0.85,
      forecastedValue: 0.72,
      driftPercentage: -15.29,
      severity: 'HIGH',
      contributingFactors: ['Increased validation failures', 'Elevated abandonment on registration steps'],
    },
    {
      metricName: 'FRICTION_SCORE',
      baseValue: 0.32,
      forecastedValue: 0.44,
      driftPercentage: 37.5,
      severity: 'MEDIUM',
      contributingFactors: ['Longer hover durations on input fields', 'Extended cursor scanning routes'],
    },
  ];

  for (const reg of regressions) {
    await prisma.regressionEvent.create({
      data: {
        projectId: project.id,
        workflowPath: 'https://sandbox.fricta.ai/checkout',
        metricName: reg.metricName,
        baseValue: reg.baseValue,
        forecastedValue: reg.forecastedValue,
        driftPercentage: reg.driftPercentage,
        severity: reg.severity,
        contributingFactors: reg.contributingFactors as any,
        historicalBaselineId: baseline.id,
      },
    });
  }

  // 6. Create SurvivabilityForecasts
  const survivals = [
    {
      personaType: 'Power User',
      predictedSurvivalRate: 0.92,
      estimatedStepsToAbandon: 6.0,
      primaryAbandonmentTrigger: 'CLUTTER_ABANDONMENT',
      riskFactors: ['Impatient flow pacing', 'Visual choice overloading'],
    },
    {
      personaType: 'Beginner Teacher',
      predictedSurvivalRate: 0.71,
      estimatedStepsToAbandon: 5.0,
      primaryAbandonmentTrigger: 'VALIDATION_FRUSTRATION',
      riskFactors: ['Form submission validation loops', 'Unclear error highlights'],
    },
    {
      personaType: 'Impatient Admin',
      predictedSurvivalRate: 0.42,
      estimatedStepsToAbandon: 3.0,
      primaryAbandonmentTrigger: 'LATENCY_INTOLERANCE',
      riskFactors: ['Low patience threshold', 'Slow form feedback loops'],
    },
  ];

  for (const s of survivals) {
    await prisma.survivabilityForecast.create({
      data: {
        workflowForecastId: forecast.id,
        personaType: s.personaType,
        predictedSurvivalRate: s.predictedSurvivalRate,
        estimatedStepsToAbandon: s.estimatedStepsToAbandon,
        primaryAbandonmentTrigger: s.primaryAbandonmentTrigger,
        riskFactors: s.riskFactors as any,
      },
    });
  }

  // 7. Create AbandonmentPredictions
  const abandonments = [
    {
      stepIndex: 0,
      abandonmentProbability: 0.12,
      triggerSource: 'STANDARD_FLOW',
      cognitiveLoadEscalation: 0.35,
      confidenceCollapseProbability: 0.15,
      retryDensityImpact: 0.1,
      hesitationAccumulationMs: 400,
      description: 'Step 1: Stable. Navigation confidence is standard.',
    },
    {
      stepIndex: 1,
      abandonmentProbability: 0.22,
      triggerSource: 'STANDARD_FLOW',
      cognitiveLoadEscalation: 0.42,
      confidenceCollapseProbability: 0.25,
      retryDensityImpact: 0.12,
      hesitationAccumulationMs: 650,
      description: 'Step 2: Stable. Mild visual searching loops detected.',
    },
    {
      stepIndex: 2,
      abandonmentProbability: 0.48,
      triggerSource: 'HESITATION_ACCUMULATION',
      cognitiveLoadEscalation: 0.62,
      confidenceCollapseProbability: 0.48,
      retryDensityImpact: 0.15,
      hesitationAccumulationMs: 1450,
      description: 'Step 3: Moderate warning. Accumulated hesitation has reached warning thresholds.',
    },
    {
      stepIndex: 3,
      abandonmentProbability: 0.74,
      triggerSource: 'CONFIDENCE_DEGRADATION',
      cognitiveLoadEscalation: 0.78,
      confidenceCollapseProbability: 0.76,
      retryDensityImpact: 0.45,
      hesitationAccumulationMs: 2200,
      description: 'Step 4: Critical warning. Highly elevated risk of abandonment due to decision fatigue and confidence collapse.',
    },
  ];

  for (const ab of abandonments) {
    await prisma.abandonmentPrediction.create({
      data: {
        workflowForecastId: forecast.id,
        stepIndex: ab.stepIndex,
        abandonmentProbability: ab.abandonmentProbability,
        triggerSource: ab.triggerSource,
        cognitiveLoadEscalation: ab.cognitiveLoadEscalation,
        confidenceCollapseProbability: ab.confidenceCollapseProbability,
        retryDensityImpact: ab.retryDensityImpact,
        hesitationAccumulationMs: ab.hesitationAccumulationMs,
        description: ab.description,
      },
    });
  }

  // 8. Create PredictiveTimelineEvents
  const timelines = [
    {
      stepIndex: 1,
      eventType: 'COGNITIVE_OVERLOAD',
      timeOffsetMs: 2500,
      predictedIntensity: 0.52,
      description: 'Cognitive load threshold check: Information density spikes as user reads layout guidelines.',
    },
    {
      stepIndex: 2,
      eventType: 'FRICTION_ESCALATION',
      timeOffsetMs: 4500,
      predictedIntensity: 0.68,
      description: 'Friction escalation predicted: Multiple form input fields in close sequence accumulate cognitive load.',
    },
    {
      stepIndex: 3,
      eventType: 'CONFIDENCE_COLLAPSE',
      timeOffsetMs: 6800,
      predictedIntensity: 0.85,
      description: 'Confidence collapse warning: Persona patience thresholds exceeded on non-obvious navigation selectors.',
    },
    {
      stepIndex: 4,
      eventType: 'ABANDONMENT_TREND',
      timeOffsetMs: 9000,
      predictedIntensity: 0.74,
      description: 'Abandonment risk reaches peak: User approaches checkout submission without clear security trust signals.',
    },
  ];

  for (const t of timelines) {
    await prisma.predictiveTimelineEvent.create({
      data: {
        workflowForecastId: forecast.id,
        stepIndex: t.stepIndex,
        eventType: t.eventType,
        timeOffsetMs: t.timeOffsetMs,
        predictedIntensity: t.predictedIntensity,
        description: t.description,
      },
    });
  }

  console.log('✅ Predictive database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
