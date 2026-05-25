import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Swarm Simulation Engine records...');

  // 1. Resolve project
  const project = await prisma.project.findFirst();
  if (!project) {
    console.error('No project found. Run seed-workspace.ts or seed-simulation.ts first.');
    process.exit(1);
  }

  // Clear existing swarm records to prevent duplicate seeding issues
  await prisma.swarmSession.deleteMany({ where: { projectId: project.id } });

  // 2. Create SwarmSession
  const swarmSession = await prisma.swarmSession.create({
    data: {
      projectId: project.id,
      name: 'Synthetic Population Flow Audit',
      startUrl: 'https://sandbox.fricta.ai/checkout',
      goal: 'Complete registration form, select payment, and click confirm billing button',
      status: 'COMPLETED',
      startedAt: new Date(Date.now() - 3600000),
      endedAt: new Date(),
    },
  });

  console.log(`Created Swarm Session: ${swarmSession.id} for Project: ${project.projectName}`);

  const personas = ['Beginner Teacher', 'Distracted Student', 'Impatient Admin', 'Power User'];
  const executionIds: string[] = [];

  // 3. Create PersonaExecutions and SwarmReplayEvents
  for (const persona of personas) {
    const isSuccess = persona !== 'Impatient Admin';
    const friction =
      persona === 'Beginner Teacher'
        ? 0.65
        : persona === 'Distracted Student'
          ? 0.75
          : persona === 'Impatient Admin'
            ? 0.9
            : 0.15;
    const stepsCompleted = persona === 'Impatient Admin' ? 3 : 5;

    // Create a dummy workflow session for integration
    const ws = await prisma.workflowSession.create({
      data: {
        projectId: project.id,
        goal: `Simulated workflow run for ${persona}`,
        persona,
        status: isSuccess ? 'COMPLETED' : 'FAILED',
        startedAt: new Date(Date.now() - 3600000),
        endedAt: new Date(),
      },
    });

    const exec = await prisma.personaExecution.create({
      data: {
        swarmSessionId: swarmSession.id,
        personaType: persona,
        workflowSessionId: ws.id,
        status: isSuccess ? 'COMPLETED' : 'FAILED',
        completionRate: isSuccess ? 1.0 : 0.0,
        durationMs: stepsCompleted * 2000,
        frictionScore: friction,
        stepsCompleted,
      },
    });

    executionIds.push(exec.id);

    // Create SwarmReplayEvents
    for (let stepIndex = 0; stepIndex < stepsCompleted; stepIndex++) {
      await prisma.swarmReplayEvent.create({
        data: {
          personaExecutionId: exec.id,
          stepIndex,
          timestampMs: stepIndex * 2000 + 500,
          eventType: stepIndex === 4 ? 'CLICK' : stepIndex % 2 === 0 ? 'INPUT' : 'HOVER',
          targetSelector:
            stepIndex === 4
              ? 'button#submit'
              : stepIndex === 0
                ? 'input#email'
                : stepIndex === 1
                  ? 'div.form-container'
                  : 'input#password',
          coordinates: {
            x: 100 + stepIndex * 90 + Math.random() * 15,
            y: 150 + Math.random() * 40,
          },
          cognitiveLoad: isSuccess ? 0.3 + stepIndex * 0.08 : 0.6 + stepIndex * 0.1,
          confidence: isSuccess ? 0.8 - stepIndex * 0.05 : 0.5 - stepIndex * 0.15,
          description: `Simulated step ${stepIndex + 1} action for ${persona}.`,
        },
      });
    }
  }

  // 4. Create PersonaComparisons
  await prisma.personaComparison.create({
    data: {
      swarmSessionId: swarmSession.id,
      personaA: 'Power User',
      personaB: 'Beginner Teacher',
      similarityScore: 0.45,
      divergenceNotes:
        'Power User completes checkout with 0.15 friction. Beginner Teacher takes longer, hesitating on email input with 0.65 friction.',
      pathVariance: 0,
      cognitiveDelta: 0.5,
    },
  });

  await prisma.personaComparison.create({
    data: {
      swarmSessionId: swarmSession.id,
      personaA: 'Power User',
      personaB: 'Distracted Student',
      similarityScore: 0.35,
      divergenceNotes:
        'Distracted Student skims layout and drifts cursor aimlessly, leading to 0.75 friction.',
      pathVariance: 0,
      cognitiveDelta: 0.6,
    },
  });

  await prisma.personaComparison.create({
    data: {
      swarmSessionId: swarmSession.id,
      personaA: 'Power User',
      personaB: 'Impatient Admin',
      similarityScore: 0.2,
      divergenceNotes:
        'Impatient Admin abandons checkout during form review due to low cognitive tolerance, whereas Power User completes flow successfully.',
      pathVariance: 2,
      cognitiveDelta: 0.75,
    },
  });

  // 5. Create DivergenceEvents
  await prisma.divergenceEvent.create({
    data: {
      swarmSessionId: swarmSession.id,
      stepIndex: 1,
      eventType: 'PATH_DIVERGENCE',
      selector: 'div.form-container',
      personaTypeA: 'Power User',
      actionA: 'SCAN on form layout',
      personaTypeB: 'Distracted Student',
      actionB: 'CURSOR_DRIFT over ad banner',
      details:
        'Distracted Student gets distracted by side-banner visual weight, diverting visual focus.',
    },
  });

  await prisma.divergenceEvent.create({
    data: {
      swarmSessionId: swarmSession.id,
      stepIndex: 3,
      eventType: 'ABANDONMENT',
      selector: 'button#submit',
      personaTypeA: 'Power User',
      actionA: 'CLICK on button#submit',
      personaTypeB: 'Impatient Admin',
      actionB: 'SYSTEM_ABANDONMENT',
      details:
        'Impatient Admin abandons workflow because validation checks took more than 3000ms.',
    },
  });

  // 6. Create WorkflowSurvivabilityMetric
  await prisma.workflowSurvivabilityMetric.create({
    data: {
      swarmSessionId: swarmSession.id,
      workflowPath: 'https://sandbox.fricta.ai/checkout',
      overallCompletionRate: 0.75,
      averageSteps: 4.5,
      failureClusterCount: 1,
      abandonmentRiskAverage: 0.6125,
      failurePoints: ['input#password', 'button#submit'],
    },
  });

  // 7. Create PopulationHeatmaps
  const heatmapElements = [
    { selector: 'input#email', clicks: 4, hovers: 12, hesitation: 1500, friction: 0.35 },
    { selector: 'input#password', clicks: 3, hovers: 9, hesitation: 2800, friction: 0.72 },
    { selector: 'button#submit', clicks: 3, hovers: 4, hesitation: 900, friction: 0.15 },
  ];

  for (const element of heatmapElements) {
    await prisma.populationHeatmap.create({
      data: {
        swarmSessionId: swarmSession.id,
        pageUrl: 'https://sandbox.fricta.ai/checkout',
        selector: element.selector,
        clickCount: element.clicks,
        hoverCount: element.hovers,
        averageHesitationMs: element.hesitation,
        averageFrictionScore: element.friction,
        attentionWeight: 0.4 + Math.random() * 0.5,
        cognitiveDensity: 0.3 + Math.random() * 0.6,
      },
    });
  }

  console.log('✅ Swarm database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
