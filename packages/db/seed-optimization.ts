import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { prisma } from './src/index';

async function seedOptimization() {
  console.log('🧪 Seeding Phase 12 Part 3: Optimization Intelligence data...');

  // ── Find a project to attach data to ────────────────────────────────────────
  const project = await prisma.project.findFirst();
  if (!project) {
    console.error('❌ No project found. Please seed a project first.');
    process.exit(1);
  }
  console.log(`  → Using project: ${project.projectName} (${project.id})`);

  // ── Experiment 1: Rage Click Reduction (ACTIVE) ──────────────────────────
  const exp1 = await prisma.uXExperiment.create({
    data: {
      projectId:       project.id,
      name:            'Checkout Button Rage Click Reduction',
      description:     'Testing simplified checkout CTA copy and placement to reduce rage click patterns detected by live anomaly engine.',
      status:          'ACTIVE',
      targetMetric:    'rage_click_rate',
      targetWorkflow:  'checkout_flow',
      evaluationWindow: 14,
      startedAt:       new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
  });
  console.log(`  ✓ Created experiment: ${exp1.name}`);

  // Hypothesis for experiment 1
  await prisma.optimizationHypothesis.create({
    data: {
      projectId:           project.id,
      experimentId:        exp1.id,
      problemStatement:    'Users are rage-clicking the checkout submit button at a rate 3.2x above baseline, indicating confusion about form validation state.',
      supportingEvidence:  JSON.stringify([
        'UXAnomaly RAGE_CLICK_SPIKE detected: 47 rage clicks in 4-minute session window',
        'Survivability metric: checkout_survivability dropped from 0.73 to 0.58 over 7 days',
        'Behavioral pattern: 83% of rage clicks occur within 2 seconds of form validation error'
      ]),
      expectedImprovement: 'rage_click_rate should decrease by at least 30% within 14 days of CTA simplification',
      measurementStrategy: 'Compare rage_click_rate baseline (captured at experiment start) to rate measured at day 14. Minimum threshold: -5% to call success.',
      riskAssessment:      'Simplifying CTA copy might reduce perceived urgency and decrease conversion rate. Monitor checkout_survivability as secondary metric.',
      evaluationWindow:    14,
      successThreshold:    0.05,
    },
  });
  console.log(`  ✓ Built hypothesis for experiment 1`);

  // Variants for experiment 1
  await prisma.experimentVariant.createMany({
    data: [
      {
        experimentId: exp1.id,
        name:         'Control',
        isControl:    true,
        description:  'Original "Complete Purchase" button with validation state hidden until submit',
        changeType:   'CTA',
        changeDetails: { buttonText: 'Complete Purchase', validationDisplay: 'on-submit' },
      },
      {
        experimentId: exp1.id,
        name:         'Variant A — Inline Validation',
        isControl:    false,
        description:  'Show inline validation as user types + change CTA to "Review & Pay"',
        changeType:   'FORM',
        changeDetails: { buttonText: 'Review & Pay', validationDisplay: 'inline-realtime' },
      },
    ],
  });

  // Baselines for experiment 1
  await prisma.improvementBaseline.createMany({
    data: [
      { projectId: project.id, experimentId: exp1.id, metricName: 'rage_click_rate',        baselineValue: 0.34, scopeKey: 'checkout_flow' },
      { projectId: project.id, experimentId: exp1.id, metricName: 'checkout_survivability', baselineValue: 0.58, scopeKey: 'checkout_flow' },
      { projectId: project.id, experimentId: exp1.id, metricName: 'active_anomaly_count',   baselineValue: 12,   scopeKey: 'checkout_flow' },
    ],
  });
  console.log(`  ✓ Captured baselines for experiment 1`);

  // ── Experiment 2: Onboarding Flow (COMPLETED with outcome) ──────────────
  const exp2 = await prisma.uXExperiment.create({
    data: {
      projectId:       project.id,
      name:            'Onboarding Step Reduction',
      description:     'Reduced onboarding from 7 steps to 4 by deferring optional profile fields to post-activation. Completed evaluation.',
      status:          'COMPLETED',
      targetMetric:    'onboarding_survivability',
      targetWorkflow:  'onboarding_flow',
      evaluationWindow: 21,
      startedAt:       new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      concludedAt:     new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`  ✓ Created experiment: ${exp2.name}`);

  await prisma.optimizationHypothesis.create({
    data: {
      projectId:           project.id,
      experimentId:        exp2.id,
      problemStatement:    'Onboarding survivability is at 0.41, with 59% of users abandoning at step 4 (profile completion). Steps 5-7 are optional but presented as required.',
      supportingEvidence:  JSON.stringify([
        'BehavioralPattern STEP_ABANDONMENT: Step 4 dropout rate 59%',
        'SurvivabilityMetric: onboarding_survivability = 0.41, target baseline 0.70',
        'SessionCorrelation: users who skip profile fields show no long-term behavior difference'
      ]),
      expectedImprovement: 'Deferring optional fields should raise onboarding_survivability from 0.41 to above 0.65 (+58% relative improvement)',
      measurementStrategy: 'Compare onboarding_survivability at day 21 vs baseline. Secondary: track 7-day retention rate.',
      riskAssessment:      'Deferred profiles may reduce data completeness in first week. Monitor user activation rate.',
      evaluationWindow:    21,
      successThreshold:    0.05,
    },
  });

  // Baselines and outcome for experiment 2
  await prisma.improvementBaseline.createMany({
    data: [
      { projectId: project.id, experimentId: exp2.id, metricName: 'onboarding_survivability', baselineValue: 0.41 },
      { projectId: project.id, experimentId: exp2.id, metricName: 'abandonment_rate',         baselineValue: 0.59 },
    ],
  });

  await prisma.experimentOutcome.create({
    data: {
      projectId:          project.id,
      experimentId:       exp2.id,
      conclusion:         'IMPROVED',
      confidenceScore:    0.85,
      baselineMetricValue: 0.41,
      outcomeMetricValue:  0.69,
      deltaPercent:        68.3,
      evaluationNotes:    'Onboarding survivability improved by 68.3% relative. 7-day retention unchanged. Profile completeness dropped 12% in week 1 but recovered by day 14.',
    },
  });
  console.log(`  ✓ Created outcome for experiment 2 (IMPROVED +68.3%)`);

  // ── Recommendation Impacts ────────────────────────────────────────────────
  await prisma.recommendationImpact.createMany({
    data: [
      {
        projectId:             project.id,
        recommendationType:    'FLOW',
        title:                 'Defer optional onboarding fields post-activation',
        description:           'Move avatar, bio, and notification preferences to a post-activation profile setup flow',
        adoptionStatus:        'ADOPTED',
        adoptedAt:             new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        baselineSurvivability: 0.41,
        currentSurvivability:  0.69,
        survivabilityDelta:    0.28,
        baselineFriction:      0.72,
        currentFriction:       0.31,
        frictionDelta:         -0.41,
        verificationStatus:    'VERIFIED_IMPROVED',
        verifiedAt:            new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        projectId:             project.id,
        recommendationType:    'CTA',
        title:                 'Simplify checkout button copy and add progress indicator',
        description:           'Replace "Complete Purchase" with step-aware CTA text and show 3-step checkout progress bar',
        adoptionStatus:        'PENDING',
        baselineSurvivability: 0.58,
        verificationStatus:    'UNVERIFIED',
      },
      {
        projectId:             project.id,
        recommendationType:    'LAYOUT',
        title:                 'Consolidate navigation from 12 items to 7 primary destinations',
        description:           'Group secondary actions under a "More" dropdown to reduce cognitive overhead',
        adoptionStatus:        'DEFERRED',
        verificationStatus:    'UNVERIFIED',
      },
    ],
  });
  console.log(`  ✓ Seeded 3 recommendation impacts`);

  // ── Optimization Memory ───────────────────────────────────────────────────
  await prisma.optimizationMemory.createMany({
    data: [
      {
        projectId:     project.id,
        memoryType:    'SUCCESSFUL_PATTERN',
        patternKey:    'onboarding_survivability_improvement',
        patternSummary: 'Onboarding Step Reduction: IMPROVED (Δ +68.3%) — Deferring optional profile fields to post-activation raised onboarding_survivability from 0.41 to 0.69.',
        outcomeType:   'SUCCESS',
        metricImpacted: 'onboarding_survivability',
        deltaAchieved:  68.3,
        experimentId:  exp2.id,
        evidenceDetails: {
          approach: 'Defer optional fields post-activation',
          riskRealized: false,
          secondaryEffects: 'Profile completeness dropped 12% in week 1 but recovered by day 14',
        },
      },
      {
        projectId:     project.id,
        memoryType:    'RECOMMENDATION_HISTORY',
        patternKey:    'checkout_cta_simplification',
        patternSummary: 'Checkout CTA simplification is in active experimentation (Experiment: Checkout Button Rage Click Reduction). Outcome pending.',
        outcomeType:   'PARTIAL',
        metricImpacted: 'rage_click_rate',
        experimentId:  exp1.id,
        evidenceDetails: {
          approach:        'Inline validation + CTA copy change',
          daysRemaining:   9,
          currentStatus:   'ACTIVE',
        },
      },
    ],
  });
  console.log(`  ✓ Seeded 2 optimization memory entries`);

  console.log('\n✅ Phase 12 Part 3 optimization intelligence data seeded successfully.');
  await prisma.$disconnect();
}

seedOptimization().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
