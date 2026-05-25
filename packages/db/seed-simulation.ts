import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Autonomous UX Simulation database seeding...');

  // 1. Ensure we have a default user
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'default-user@fricta.ai',
        name: 'Default User',
      },
    });
  }

  // 2. Ensure we have a project
  let project = await prisma.project.findFirst();
  if (!project) {
    project = await prisma.project.create({
      data: {
        userId: user.id,
        projectName: 'eCommerce Checkout Sandbox',
        websiteUrl: 'https://sandbox.fricta.ai/checkout',
      },
    });
  }

  // 3. Create simulation profile
  const profile = await prisma.simulationProfile.create({
    data: {
      projectId: project.id,
      name: 'Beginner Persona Checkout Simulation',
      personaType: 'BEGINNER',
      description: 'Audit checkout form fields under layout friction conditions.',
      traits: {
        navigationConfidence: 0.3,
        explorationPatience: 0.4,
        errorTolerance: 0.2,
        readingDepth: 0.8,
        ctaTrustLevel: 0.4,
        formConfidence: 0.3,
        cognitiveTolerance: 0.3,
        attentionStability: 0.9,
      },
    },
  });
  console.log(`Created simulation profile: ${profile.name}`);

  // 4. Create workflow session representing simulation run
  const session = await prisma.workflowSession.create({
    data: {
      projectId: project.id,
      goal: 'Simulated: Checkout Form Submission',
      persona: 'BEGINNER (Synthetic)',
      status: 'COMPLETED',
      startedAt: new Date(),
      endedAt: new Date(),
    },
  });

  // 5. Seed decisions
  const decisions = [
    { type: 'SCAN', target: 'form.checkout-fields', reason: 'Scanning checkout fields list.', confBef: 0.3, confAft: 0.35, latency: 1200 },
    { type: 'INPUT', target: 'input[name="email"]', reason: 'User filling email address input field.', confBef: 0.35, confAft: 0.4, latency: 2500 },
    { type: 'HOVER', target: 'button[type="submit"]', reason: 'Scanning the checkout CTA button.', confBef: 0.4, confAft: 0.4, latency: 900 },
    { type: 'CLICK', target: 'button[type="submit"]', reason: 'Clicking the primary submit button.', confBef: 0.4, confAft: 0.6, latency: 1100 },
  ];

  for (let idx = 0; idx < decisions.length; idx++) {
    const dec = decisions[idx];
    await prisma.behavioralDecision.create({
      data: {
        simulationProfileId: profile.id,
        workflowSessionId: session.id,
        stepIndex: idx,
        actionType: dec.type,
        targetElement: dec.target,
        decisionReason: dec.reason,
        confidenceBefore: dec.confBef,
        confidenceAfter: dec.confAft,
        latencyMs: dec.latency,
      },
    });

    await prisma.navigationConfidenceEvent.create({
      data: {
        workflowSessionId: session.id,
        stepIndex: idx,
        confidenceValue: dec.confAft,
        contextualDetails: `Step ${idx} complete. Action: ${dec.type}. Reason: ${dec.reason}`,
      },
    });

    // Seed replay coordinates
    await prisma.behavioralReplayEvent.create({
      data: {
        simulationProfileId: profile.id,
        workflowSessionId: session.id,
        stepIndex: idx,
        eventType: dec.type,
        coordinates: { x: 120 + idx * 90 + Math.random() * 20, y: 180 + Math.random() * 40 },
        targetSelector: dec.target,
        durationMs: dec.latency,
      },
    });
  }

  // 6. Seed hesitation signals
  await prisma.hesitationSignal.create({
    data: {
      workflowSessionId: session.id,
      stepIndex: 1,
      signalType: 'FORM_FIELD_UNCERTAINTY',
      targetElement: 'input[name="email"]',
      durationMs: 1800,
      severity: 'MEDIUM',
      description: 'User hesitated while filling out the email field, double-checking correct affordance.',
    },
  });

  // 7. Seed friction reaction
  await prisma.frictionReaction.create({
    data: {
      workflowSessionId: session.id,
      stepIndex: 2,
      reactionType: 'EXPLORATION_SLOWDOWN',
      triggerSource: 'Low Contrast CTA',
      intensity: 0.65,
      description: 'Slowed down click decision due to ambiguous CTA border contrast.',
    },
  });

  // 8. Seed exploration path
  await prisma.explorationPath.create({
    data: {
      simulationProfileId: profile.id,
      workflowSessionId: session.id,
      steps: [
        { stepIndex: 0, url: 'https://sandbox.fricta.ai/checkout', action: 'SCAN', duration: 1200 },
        { stepIndex: 1, url: 'https://sandbox.fricta.ai/checkout', action: 'INPUT', duration: 2500 },
        { stepIndex: 2, url: 'https://sandbox.fricta.ai/checkout', action: 'HOVER', duration: 900 },
        { stepIndex: 3, url: 'https://sandbox.fricta.ai/checkout', action: 'CLICK', duration: 1100 },
      ] as any,
      isSuccess: true,
      totalFrictionScore: 0.45,
    },
  });

  console.log('✅ Autonomous UX Simulation database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
