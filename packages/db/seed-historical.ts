import { PrismaClient } from '@prisma/client';
import { HistoricalIntelligencePipeline } from '@fricta/historical-intelligence';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with historical UX session logs...');

  // 1. Create or fetch user
  const user = await prisma.user.upsert({
    where: { email: 'test@fricta.ai' },
    update: {},
    create: {
      email: 'test@fricta.ai',
      name: 'UX Tester',
    },
  });

  // 2. Create historical project
  const project = await prisma.project.create({
    data: {
      userId: user.id,
      projectName: 'Fricta E-Commerce Portal',
      websiteUrl: 'https://store.fricta.ai',
    },
  });

  const projectId = project.id;
  console.log(`Created Project: ${project.projectName} (${projectId})`);

  // 3. Create 5 sequential workflow sessions (Version 1 to Version 5)
  // We will simulate a workflow where Version 3 introduced regressions, and Version 5 fixed them.
  const sessionGoals = [
    { goal: 'Complete checkout of shopping cart', persona: 'BEGINNER', status: 'COMPLETED', duration: 120, steps: 10, findingsCount: 2, overloadCount: 0, hesitationCount: 1 },
    { goal: 'Complete checkout of shopping cart', persona: 'BEGINNER', status: 'COMPLETED', duration: 115, steps: 9, findingsCount: 1, overloadCount: 0, hesitationCount: 0 },
    { goal: 'Complete checkout of shopping cart', persona: 'BEGINNER', status: 'FAILED', duration: 250, steps: 18, findingsCount: 6, overloadCount: 3, hesitationCount: 4 }, // REGRESSION
    { goal: 'Complete checkout of shopping cart', persona: 'POWER_USER', status: 'COMPLETED', duration: 160, steps: 13, findingsCount: 3, overloadCount: 1, hesitationCount: 2 },
    { goal: 'Complete checkout of shopping cart', persona: 'BEGINNER', status: 'COMPLETED', duration: 95, steps: 8, findingsCount: 0, overloadCount: 0, hesitationCount: 0 }  // IMPROVEMENT
  ];

  const sessionIds = [];

  for (let i = 0; i < sessionGoals.length; i++) {
    const s = sessionGoals[i];
    const createdAt = new Date(Date.now() - (5 - i) * 24 * 60 * 60 * 1000); // 5 days ago to today

    const session = await prisma.workflowSession.create({
      data: {
        projectId,
        goal: s.goal,
        persona: s.persona,
        status: s.status,
        stepCount: s.steps,
        createdAt,
        startedAt: createdAt,
        endedAt: new Date(createdAt.getTime() + s.duration * 1000)
      }
    });

    sessionIds.push(session.id);

    // Save metrics
    await prisma.workflowMetrics.create({
      data: {
        workflowSessionId: session.id,
        duration: s.duration,
        completionStatus: s.status,
        retryCount: s.status === 'FAILED' ? 2 : 0,
        tokenUsage: 1500 * (i + 1)
      }
    });

    // Save findings
    for (let fIdx = 0; fIdx < s.findingsCount; fIdx++) {
      await prisma.uXFinding.create({
        data: {
          workflowSessionId: session.id,
          findingType: fIdx === 0 ? 'NAVIGATION_LOOP' : 'CTA_AMBIGUITY',
          severity: fIdx === 0 ? 'HIGH' : 'MEDIUM',
          personaType: s.persona,
          title: fIdx === 0 ? 'Circular checkout loop' : 'Missing next action indicator',
          description: fIdx === 0 ? 'User clicked checkout and was routed back to cart twice.' : 'The next checkout step is not immediately visible.',
          evidence: `/checkout step ${fIdx + 2}`,
          recommendation: 'Fix routing path and add bright CTA highlights.'
        }
      });
    }

    // Save cognitive signals
    for (let cIdx = 0; cIdx < s.overloadCount; cIdx++) {
      await prisma.cognitiveSignal.create({
        data: {
          workflowSessionId: session.id,
          signalType: 'COGNITIVE_OVERLOAD',
          intensity: 0.82,
          metadata: { stepIndex: cIdx + 4, url: 'https://store.fricta.ai/checkout' }
        }
      });
    }

    // Seed mock orchestration session to tie everything together
    await prisma.orchestrationSession.create({
      data: {
        workflowSessionId: session.id,
        status: s.status,
        startedAt: createdAt,
        completedAt: new Date(createdAt.getTime() + s.duration * 1000),
        metadata: { info: `Seeded history run ${i + 1}` }
      }
    });
  }

  // 4. Run the Historical Intelligence Pipeline to calculate all patterns and regressions
  console.log('\nRunning Historical Intelligence Pipeline over seeded history...');
  const pipeline = new HistoricalIntelligencePipeline(prisma);
  const result = await pipeline.runPipeline(projectId, sessionIds[sessionIds.length - 1]);

  console.log('\n✅ Seeded historical sessions successfully!');
  console.log(`Generated:`);
  console.log(`- ${sessionIds.length} Workflow Sessions`);
  console.log(`- ${result.regressions.length} Workflow Regression records`);
  console.log(`- ${result.patterns.length} Historical Pattern records`);
  console.log(`- ${result.adaptiveProfiles.length} Adaptive Signal Overrides`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
