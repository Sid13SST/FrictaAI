import { prisma } from './src';
import { PredictiveIntelligenceEngine } from '../predictive-intelligence/src';

async function seed() {
  console.log('--- Starting Predictive Intelligence Seeding ---');

  // 1. Ensure a user exists
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'founder@fricta.ai',
        name: 'Fricta Founder'
      }
    });
    console.log('Created default user:', user.email);
  }

  // 2. Ensure a project exists
  let project = await prisma.project.findFirst({
    where: { userId: user.id }
  });
  if (!project) {
    project = await prisma.project.create({
      data: {
        userId: user.id,
        projectName: 'Fricta Core App',
        websiteUrl: 'https://fricta.ai'
      }
    });
    console.log('Created default project:', project.projectName);
  }

  // 3. Create sample sessions to analyze
  console.log('Creating mock sessions, findings, reactions, and hesitations...');
  const session1 = await prisma.workflowSession.create({
    data: {
      projectId: project.id,
      goal: 'User Onboarding Flow',
      persona: 'BEGINNER',
      status: 'FAILED',
      stepCount: 12,
      uxFindings: {
        create: [
          {
            findingType: 'ONBOARDING_FRICTION',
            severity: 'CRITICAL',
            personaType: 'BEGINNER',
            title: 'Overwhelming Profile Details Required',
            description: 'The onboarding asks for 15 form fields on step 3.',
            evidence: 'form.onboarding-profile',
            recommendation: 'Use progressive disclosure or auto-fill fields.'
          },
          {
            findingType: 'CTA_AMBIGUITY',
            severity: 'HIGH',
            personaType: 'BEGINNER',
            title: 'Ambiguous Primary CTA on Step 4',
            description: 'Button color blends into background, causing discoverability delays.',
            evidence: 'button.cta-primary',
            recommendation: 'Contrast CTA color and spacing.'
          }
        ]
      },
      frictionReactions: {
        create: [
          {
            stepIndex: 3,
            reactionType: 'RETRY_HESITATION',
            triggerSource: 'CTA_AMBIGUITY',
            intensity: 0.8,
            description: 'Repeated clicks on the unresponsive submit button.'
          },
          {
            stepIndex: 5,
            reactionType: 'ABANDONMENT_RISK',
            triggerSource: 'ONBOARDING_FRICTION',
            intensity: 0.95,
            description: 'User left the tab during onboarding.'
          }
        ]
      },
      hesitationSignals: {
        create: [
          {
            stepIndex: 3,
            signalType: 'HOVER_HESITATION',
            targetElement: 'input#org-address',
            durationMs: 4200,
            severity: 'MEDIUM',
            description: 'User hovered over address input for 4.2 seconds.'
          }
        ]
      }
    }
  });

  const session2 = await prisma.workflowSession.create({
    data: {
      projectId: project.id,
      goal: 'Onboarding Step-by-Step Checkout',
      persona: 'STANDARD',
      status: 'COMPLETED',
      stepCount: 6,
      uxFindings: {
        create: [
          {
            findingType: 'NAVIGATION_LOOP',
            severity: 'MEDIUM',
            personaType: 'STANDARD',
            title: 'Backtrack on checkout step',
            description: 'User navigated back twice to correct card information.',
            evidence: 'nav.back',
            recommendation: 'Provide clear cart summary overlay.'
          }
        ]
      }
    }
  });

  console.log(`Mock sessions seeded: ${session1.id}, ${session2.id}`);

  // 4. Run the predictive pipeline via the engine
  console.log('Running the predictive intelligence engine forecast pipeline...');
  const results = await PredictiveIntelligenceEngine.runForecastPipeline(project.id, null);
  console.log('Forecasting pipeline completed. Results:', results);

  // 5. Query and log the generated predictions to verify correctness
  const predictions = await prisma.uXFailurePrediction.findMany({
    where: { projectId: project.id },
    include: { evidence: true }
  });
  console.log(`Generated ${predictions.length} predictions in database:`);
  for (const pred of predictions) {
    console.log(`- [${pred.predictedFailureType}] at ${pred.workflowPath}: Prob=${pred.probability}, Sev=${pred.severity}`);
    console.log(`  Evidence logs count: ${pred.evidence.length}`);
  }

  const cognitiveSignals = await prisma.cognitiveRiskSignal.findMany({
    where: { projectId: project.id }
  });
  console.log(`Generated ${cognitiveSignals.length} cognitive risk signals:`);
  for (const sig of cognitiveSignals) {
    console.log(`- Persona: ${sig.personaType}, Type: ${sig.riskType}, Predicted Load: ${sig.predictedLoad}%`);
  }

  const riskScores = await prisma.workflowRiskScore.findMany({
    where: { projectId: project.id }
  });
  console.log(`Generated ${riskScores.length} workflow risk scores:`);
  for (const r of riskScores) {
    console.log(`- Path: ${r.workflowPath}, Stability Index: ${r.stabilityIndex}%, Risk: ${r.riskScore} pts`);
  }

  console.log('--- Seeding and Validation Complete ---');
}

seed()
  .catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
