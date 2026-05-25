import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Cognitive decision modeling engine records...');

  // 1. Fetch project and workflow session
  const project = await prisma.project.findFirst();
  if (!project) {
    console.error('No project found. Run seed-simulation.ts first.');
    process.exit(1);
  }

  const session = await prisma.workflowSession.findFirst({
    where: { projectId: project.id },
    orderBy: { createdAt: 'desc' },
  });

  if (!session) {
    console.error('No workflow session found. Run seed-simulation.ts first.');
    process.exit(1);
  }

  console.log(`Seeding cognitive data for Session ID: ${session.id} (Project: ${project.projectName})`);

  // Clear any existing cognition data for this session to prevent duplicate seeding
  await Promise.all([
    prisma.cognitiveState.deleteMany({ where: { workflowSessionId: session.id } }),
    prisma.confidenceSignal.deleteMany({ where: { workflowSessionId: session.id } }),
    prisma.attentionEvent.deleteMany({ where: { workflowSessionId: session.id } }),
    prisma.expectationMismatch.deleteMany({ where: { workflowSessionId: session.id } }),
    prisma.decisionComplexityEvent.deleteMany({ where: { workflowSessionId: session.id } }),
    prisma.abandonmentRiskSignal.deleteMany({ where: { workflowSessionId: session.id } }),
    prisma.cognitiveTimelineEvent.deleteMany({ where: { workflowSessionId: session.id } }),
  ]);

  // Step 0: Scanning checkout fields list
  await prisma.cognitiveState.create({
    data: {
      workflowSessionId: session.id,
      stepIndex: 0,
      cognitiveLoad: 0.35,
      mentalEffort: 0.3,
      informationLoad: 0.4,
      interactionLoad: 0.2,
      description: 'Initial layout visual scanning. Cognitive load remains low.',
    },
  });

  const signal0 = await prisma.confidenceSignal.create({
    data: {
      workflowSessionId: session.id,
      stepIndex: 0,
      confidenceScore: 0.75,
      certaintyLevel: 'HIGH',
      targetElement: 'form.checkout-fields',
      evidenceSource: 'CLICK_CERTAINTY',
      description: 'User locates form structure with high certainty.',
    },
  });

  await prisma.attentionEvent.create({
    data: {
      workflowSessionId: session.id,
      stepIndex: 0,
      targetElement: 'form.checkout-fields',
      visibilityWeight: 0.6,
      focusHeat: 0.65,
      description: 'Primary focus centered on main form card container.',
    },
  });

  await prisma.decisionComplexityEvent.create({
    data: {
      workflowSessionId: session.id,
      stepIndex: 0,
      choiceCount: 3,
      ambiguityScore: 0.2,
      complexityLevel: 'LOW',
      nextActionClarity: 0.8,
      description: 'Choice overload is low. User faces standard configuration.',
    },
  });

  await prisma.abandonmentRiskSignal.create({
    data: {
      workflowSessionId: session.id,
      stepIndex: 0,
      riskProbability: 0.15,
      triggerSource: 'STABLE_WORKFLOW',
      frictionAccumulated: 0.1,
      description: 'User begins flow with minimum cognitive friction.',
    },
  });

  // Step 1: Form field input (Email input)
  const state1 = await prisma.cognitiveState.create({
    data: {
      workflowSessionId: session.id,
      stepIndex: 1,
      cognitiveLoad: 0.62,
      mentalEffort: 0.58,
      informationLoad: 0.45,
      interactionLoad: 0.65,
      description: 'Cognitive load escalated while reviewing inputs and validation requirements.',
    },
  });

  const signal1 = await prisma.confidenceSignal.create({
    data: {
      workflowSessionId: session.id,
      stepIndex: 1,
      confidenceScore: 0.45,
      certaintyLevel: 'MEDIUM',
      targetElement: 'input[name="email"]',
      evidenceSource: 'REPEATED_SCANNING',
      description: 'Confidence degraded due to form input validation hesitation.',
    },
  });

  await prisma.attentionEvent.create({
    data: {
      workflowSessionId: session.id,
      stepIndex: 1,
      targetElement: 'input[name="email"]',
      visibilityWeight: 0.4,
      focusHeat: 0.5,
      description: 'Visual focus shifted to inputs. Cluttered instructions split user attention.',
    },
  });

  await prisma.decisionComplexityEvent.create({
    data: {
      workflowSessionId: session.id,
      stepIndex: 1,
      choiceCount: 5,
      ambiguityScore: 0.4,
      complexityLevel: 'MEDIUM',
      nextActionClarity: 0.5,
      description: 'Moderate decision density. User reviewing multiple required form inputs.',
    },
  });

  const risk1 = await prisma.abandonmentRiskSignal.create({
    data: {
      workflowSessionId: session.id,
      stepIndex: 1,
      riskProbability: 0.38,
      triggerSource: 'EXPLORATION_FATIGUE',
      frictionAccumulated: 0.4,
      description: 'Impatience rising due to dense layout validation requirements.',
    },
  });

  // Step 2: Mismatch Event (Settings Location / Hover ambiguity)
  await prisma.cognitiveState.create({
    data: {
      workflowSessionId: session.id,
      stepIndex: 2,
      cognitiveLoad: 0.78,
      mentalEffort: 0.8,
      informationLoad: 0.75,
      interactionLoad: 0.5,
      description: 'Critical load spike. Mismatched layouts positioning forces excessive search effort.',
    },
  });

  const signal2 = await prisma.confidenceSignal.create({
    data: {
      workflowSessionId: session.id,
      stepIndex: 2,
      confidenceScore: 0.28,
      certaintyLevel: 'LOW',
      targetElement: 'button.settings-avatar',
      evidenceSource: 'CURSOR_DRIFT',
      description: 'Confidence collapsed. User confused by non-standard hidden settings placement.',
    },
  });

  const attention2 = await prisma.attentionEvent.create({
    data: {
      workflowSessionId: session.id,
      stepIndex: 2,
      targetElement: 'button.settings-avatar',
      visibilityWeight: 0.25,
      focusHeat: 0.3,
      overloadDetected: true,
      description: 'Focus heat is low. User struggling to locate target due to high layouts noise.',
    },
  });

  const mismatch2 = await prisma.expectationMismatch.create({
    data: {
      workflowSessionId: session.id,
      stepIndex: 2,
      expectedAction: 'Settings option directly visible in Top Navigation header',
      actualAction: 'Settings option hidden inside collapsible Avatar Dropdown',
      mismatchSeverity: 'HIGH',
      mismatchCategory: 'NAV_MISPLACEMENT',
      description: 'Settings Misplacement Mismatch: expected in navbar header, found inside profile avatar dropdown.',
    },
  });

  await prisma.decisionComplexityEvent.create({
    data: {
      workflowSessionId: session.id,
      stepIndex: 2,
      choiceCount: 6,
      ambiguityScore: 0.75,
      complexityLevel: 'HIGH',
      nextActionClarity: 0.25,
      description: 'High layouts ambiguity. Next action triggers scan loop to locate settings button.',
    },
  });

  const risk2 = await prisma.abandonmentRiskSignal.create({
    data: {
      workflowSessionId: session.id,
      stepIndex: 2,
      riskProbability: 0.82,
      triggerSource: 'CONFIDENCE_DEGRADATION',
      frictionAccumulated: 0.78,
      description: 'Severe abandonment risk. Repeated search loops exceed cognitive persistence.',
    },
  });

  // Seed Timeline Events
  await prisma.cognitiveTimelineEvent.create({
    data: {
      workflowSessionId: session.id,
      stepIndex: 1,
      eventType: 'COGNITIVE_LOAD_SPIKE',
      intensity: 0.62,
      associatedId: state1.id,
      description: 'Mental effort spiked to 62% during required input reviews.',
    },
  });

  await prisma.cognitiveTimelineEvent.create({
    data: {
      workflowSessionId: session.id,
      stepIndex: 2,
      eventType: 'EXPECTATION_FAIL',
      intensity: 0.85,
      associatedId: mismatch2.id,
      description: 'Mental schema mismatch on button.settings-avatar: settings misplacement in profile dropdown.',
    },
  });

  await prisma.cognitiveTimelineEvent.create({
    data: {
      workflowSessionId: session.id,
      stepIndex: 2,
      eventType: 'CONFIDENCE_DROP',
      intensity: 0.72,
      associatedId: signal2.id,
      description: 'Navigation confidence collapsed to 28% from cursor drifts.',
    },
  });

  await prisma.cognitiveTimelineEvent.create({
    data: {
      workflowSessionId: session.id,
      stepIndex: 2,
      eventType: 'RISK_ESCALATION',
      intensity: 0.82,
      associatedId: risk2.id,
      description: 'Abandonment risk escalated to 82% triggered by confidence degradation.',
    },
  });

  console.log('✅ Cognitive UX data seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
