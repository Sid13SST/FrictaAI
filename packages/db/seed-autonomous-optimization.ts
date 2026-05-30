import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { prisma } from './src/index';

async function seedAutonomous() {
  console.log('🔮 Seeding Phase 12 Part 4: Human-Supervised Autonomous Optimization data...');

  // ── Find a project ─────────────────────────────────────────────────────────
  const project = await prisma.project.findFirst();
  if (!project) {
    console.error('❌ No project found. Please seed a project first.');
    process.exit(1);
  }
  console.log(`  → Using project: ${project.projectName} (${project.id})`);

  // Clear existing items if any to keep db clean
  await prisma.forecastAccuracyRecord.deleteMany({ where: { forecast: { projectId: project.id } } });
  await prisma.optimizationOutcome.deleteMany({ where: { recommendation: { projectId: project.id } } });
  await prisma.recommendationDecision.deleteMany({ where: { recommendation: { projectId: project.id } } });
  await prisma.initiativeRecommendation.deleteMany({ where: { projectId: project.id } });
  await prisma.optimizationForecast.deleteMany({ where: { projectId: project.id } });
  await prisma.optimizationOpportunity.deleteMany({ where: { projectId: project.id } });
  await prisma.optimizationPlan.deleteMany({ where: { projectId: project.id } });
  await prisma.optimizationRoadmap.deleteMany({ where: { projectId: project.id } });

  // ── Create Optimization Plan ───────────────────────────────────────────────
  const plan = await prisma.optimizationPlan.create({
    data: {
      projectId: project.id,
      name: 'Q3 2026 Core UX Optimization Plan',
      description: 'Systematic plan addressing high friction checkout spikes, onboarding drop-offs, and circular navigation loops.',
      status: 'ACTIVE'
    }
  });
  console.log(`  ✓ Created plan: ${plan.name}`);

  // ── Create Opportunities ───────────────────────────────────────────────────
  const opp1 = await prisma.optimizationOpportunity.create({
    data: {
      projectId: project.id,
      opportunityType: 'ONBOARDING',
      title: 'Optimize Onboarding Completion Rate',
      description: 'Onboarding step 4 profile completion fields show a drop-off rate of 59%, causing onboarding survivability to dip below the 80% threshold.',
      evidence: JSON.stringify([
        'Metric ONBOARDING_SURVIVABILITY is at 0.58',
        'FrictionSignal: 12 occurrences of step completion timeouts on profile setup page',
        'CrossSessionPattern: users drop off when asked to upload profile avatars'
      ]),
      score: 48.5,
      impactPotential: 0.15,
      userReach: 0.45,
      severity: 'HIGH',
      confidence: 0.72,
      survivabilityGain: 0.12,
      implementationComplexity: 'MEDIUM'
    }
  });

  const opp2 = await prisma.optimizationOpportunity.create({
    data: {
      projectId: project.id,
      opportunityType: 'HIGH_FRICTION',
      title: 'Mitigate Checkout CTA Rage Clicks',
      description: 'Active rage click spikes detected on checkout complete payment CTA button indicate confusion or validation error blocks.',
      evidence: JSON.stringify([
        'Anomaly RAGE_CLICK_SPIKE: 47 clicks/min on checkout button',
        'LiveSession: sess_98123 showed 8 rage clicks in 4 seconds',
        'Predictive: COGNITIVE_OVERLOAD_RISK score at 0.88'
      ]),
      score: 75.6,
      impactPotential: 0.20,
      userReach: 0.35,
      severity: 'CRITICAL',
      confidence: 0.85,
      survivabilityGain: 0.18,
      implementationComplexity: 'LOW'
    }
  });

  console.log('  ✓ Created 2 opportunities');

  // ── Create Forecasts ───────────────────────────────────────────────────────
  const fc1 = await prisma.optimizationForecast.create({
    data: {
      projectId: project.id,
      opportunityId: opp1.id,
      planId: plan.id,
      metricName: 'onboarding_survivability',
      currentValue: 0.58,
      forecastedValue: 0.70,
      confidenceIntervalLower: 0.65,
      confidenceIntervalUpper: 0.75,
      uncertaintyDetails: 'Projected onboarding survivability improvement of +20.7%. Highly contingent on streamlining required profile fields.'
    }
  });

  const fc2 = await prisma.optimizationForecast.create({
    data: {
      projectId: project.id,
      opportunityId: opp2.id,
      planId: plan.id,
      metricName: 'checkout_rage_click_rate',
      currentValue: 0.34,
      forecastedValue: 0.10,
      confidenceIntervalLower: 0.05,
      confidenceIntervalUpper: 0.15,
      uncertaintyDetails: 'Projected rage click reduction of -70.5%. High confidence given inline error validations.'
    }
  });

  console.log('  ✓ Generated 2 forecasts');

  // ── Create Roadmaps ────────────────────────────────────────────────────────
  const roadmapQ3 = await prisma.optimizationRoadmap.create({
    data: {
      projectId: project.id,
      quarter: '2026-Q3',
      title: '2026-Q3 UX Optimization Roadmap',
      description: 'Quick-win and high priority UX items.',
      status: 'PUBLISHED'
    }
  });

  const roadmapQ4 = await prisma.optimizationRoadmap.create({
    data: {
      projectId: project.id,
      quarter: '2026-Q4',
      title: '2026-Q4 UX Optimization Roadmap',
      description: 'Medium-complexity workflow adjustments.',
      status: 'DRAFT'
    }
  });

  console.log('  ✓ Initialized 2 roadmaps');

  // ── Create Recommendations (Initiatives) ───────────────────────────────────
  const rec1 = await prisma.initiativeRecommendation.create({
    data: {
      projectId: project.id,
      planId: plan.id,
      opportunityId: opp1.id,
      roadmapId: roadmapQ4.id,
      title: 'Simplify profile avatar upload step',
      description: 'Defer required avatar and bio creation fields to post-onboarding user profiles to decrease initial form drop-off rates.',
      impactArea: 'ONBOARDING',
      score: 48.5,
      complexity: 'MEDIUM',
      status: 'UNDER_REVIEW'
    }
  });

  const rec2 = await prisma.initiativeRecommendation.create({
    data: {
      projectId: project.id,
      planId: plan.id,
      opportunityId: opp2.id,
      roadmapId: roadmapQ3.id,
      title: 'Introduce inline real-time input validation',
      description: 'Show visual validation checkmarks next to credit card and zipcode inputs to prevent checkout rage click spikes.',
      impactArea: 'HIGH_FRICTION',
      score: 75.6,
      complexity: 'LOW',
      status: 'APPROVED'
    }
  });

  console.log('  ✓ Created 2 initiative recommendations');

  // ── Create Decisions ───────────────────────────────────────────────────────
  await prisma.recommendationDecision.create({
    data: {
      recommendationId: rec2.id,
      userId: 'demo-user-id',
      action: 'APPROVED',
      comments: 'Simulations indicate a high safety score of 92%. Low development complexity makes this an easy Q3 win.',
      externalReference: 'https://jira.company.com/browse/UX-412'
    }
  });

  console.log('  ✓ Created human decision logs');

  // ── Create Outcomes ────────────────────────────────────────────────────────
  const outcome = await prisma.optimizationOutcome.create({
    data: {
      recommendationId: rec2.id,
      metricName: 'checkout_rage_click_rate',
      baselineValue: 0.34,
      actualValue: 0.08,
      deltaPercent: 76.5,
      verdict: 'SUCCESS'
    }
  });

  console.log('  ✓ Logged outcomes');

  // ── Create Forecast Accuracy Records ───────────────────────────────────────
  await prisma.forecastAccuracyRecord.create({
    data: {
      forecastId: fc2.id,
      actualValue: 0.08,
      errorPercent: 20.0
    }
  });

  console.log('  ✓ Logged accuracy records');

  console.log('\n✅ Phase 12 Part 4 optimization planning seed complete.');
  await prisma.$disconnect();
}

seedAutonomous().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
