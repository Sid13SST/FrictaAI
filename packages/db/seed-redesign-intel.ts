import { prisma } from './src';
import { RedesignIntelligenceEngine } from '../redesign-intelligence/src';

async function seed() {
  console.log('--- Starting Redesign Intelligence Seeding ---');

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

  // 3. Check for existing sessions; if none exist, create mock sessions
  const sessionsCount = await prisma.workflowSession.count({
    where: { projectId: project.id }
  });

  if (sessionsCount === 0) {
    console.log('Creating mock sessions for evaluation...');
    await prisma.workflowSession.create({
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
  }

  // 4. Run the redesign pipeline
  console.log('Running redesign intelligence engine pipeline...');
  const results = await RedesignIntelligenceEngine.runRedesignPipeline(project.id, null);
  console.log('Redesign pipeline execution finished:', results);

  // 5. Query and verify the results
  const recommendations = await prisma.redesignRecommendation.findMany({
    where: { projectId: project.id },
    include: {
      evidence: true,
      impactForecasts: true,
      redesignTraces: true
    }
  });

  console.log(`Generated ${recommendations.length} redesign recommendations:`);
  for (const rec of recommendations) {
    console.log(`- [${rec.recommendationType}] ${rec.title} (Impact: ${rec.impactScore}%)`);
    console.log(`  Proposed: ${rec.proposedChange}`);
    console.log(`  Evidence items: ${rec.evidence.length}`);
    console.log(`  Impact forecasts: ${rec.impactForecasts.length}`);
    console.log(`  Redesign Traces: ${rec.redesignTraces.length}`);
  }

  const remediations = await prisma.cognitiveRemediation.findMany({
    where: { projectId: project.id }
  });
  console.log(`Generated ${remediations.length} cognitive remediations:`);
  for (const rem of remediations) {
    console.log(`- Target Step ${rem.targetStep}: ${rem.remediationPlan} (Complexity Red.: ${rem.complexityReduction}%)`);
  }

  const optimizations = await prisma.workflowOptimization.findMany({
    where: { projectId: project.id }
  });
  console.log(`Generated ${optimizations.length} workflow optimizations:`);
  for (const opt of optimizations) {
    console.log(`- Path ${opt.workflowPath}: ${opt.remediationStrategy} (Step Reduction: ${opt.stepCountReduction})`);
  }

  const suggestions = await prisma.uXOptimizationSuggestion.findMany({
    where: { projectId: project.id }
  });
  console.log(`Generated ${suggestions.length} general suggestions:`);
  for (const sug of suggestions) {
    console.log(`- [${sug.category}] ${sug.title} (Effort: ${sug.effortEstimate})`);
  }

  console.log('--- Redesign Intelligence Seeding & Verification Complete ---');
}

seed()
  .catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
