import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { prisma } from './src/index';

async function seedProductStrategy() {
  console.log('🔮 Seeding Phase 13 Part 1: Product Strategy Intelligence data...');

  const project = await prisma.project.findFirst();
  if (!project) {
    console.error('❌ No project found. Please seed a project first.');
    process.exit(1);
  }
  console.log(`  → Using project: ${project.projectName} (${project.id})`);

  // Clear existing items if any to keep db clean
  await prisma.productHealthSnapshot.deleteMany({ where: { projectId: project.id } });
  await prisma.executiveMetric.deleteMany({ where: { projectId: project.id } });
  await prisma.opportunityScore.deleteMany({ where: { projectId: project.id } });
  await prisma.strategicRisk.deleteMany({ where: { initiative: { projectId: project.id } } });
  await prisma.initiativeEvidence.deleteMany({ where: { initiative: { projectId: project.id } } });
  await prisma.productInitiative.deleteMany({ where: { projectId: project.id } });
  await prisma.productRoadmap.deleteMany({ where: { projectId: project.id } });
  await prisma.strategicObjective.deleteMany({ where: { projectId: project.id } });

  // 1. Create UX Anomalies & Investigation Threads if not present, so we have good evidence to link
  let anomaly = await prisma.uXAnomaly.findFirst({ where: { projectId: project.id } });
  if (!anomaly) {
    anomaly = await prisma.uXAnomaly.create({
      data: {
        projectId: project.id,
        anomalyType: 'RAGE_CLICK_SPIKE',
        severity: 'CRITICAL',
        description: 'Checkout rage click frequency exceeded 15 clicks/min',
        status: 'ACTIVE',
        isResolved: false
      }
    });
    console.log(`  ✓ Created mock UXAnomaly: ${anomaly.id}`);
  }

  let thread = await prisma.investigationThread.findFirst({ where: { projectId: project.id } });
  if (!thread) {
    thread = await prisma.investigationThread.create({
      data: {
        projectId: project.id,
        title: 'Checkout Friction Deep Dive Thread',
        status: 'OPEN'
      }
    });
    console.log(`  ✓ Created mock InvestigationThread: ${thread.id}`);
  }

  // 2. Create Strategic Objectives
  const obj1 = await prisma.strategicObjective.create({
    data: {
      projectId: project.id,
      title: 'Optimize Checkout Flow Efficiency',
      description: 'Streamline final checkout and payment forms to minimize abandonment and friction blocks.',
      targetMetric: 'checkout_survivability',
      targetValue: 92.5
    }
  });

  const obj2 = await prisma.strategicObjective.create({
    data: {
      projectId: project.id,
      title: 'Enhance User Acquisition & Onboarding',
      description: 'Streamline profile creation and registration conversion funnels.',
      targetMetric: 'onboarding_survivability',
      targetValue: 85.0
    }
  });
  console.log('  ✓ Created 2 Strategic Objectives');

  // 3. Create Roadmaps
  const roadmapQ3 = await prisma.productRoadmap.create({
    data: {
      projectId: project.id,
      quarter: '2026-Q3',
      title: 'Checkout Performance & Conversion Optimizations',
      description: 'Focus on resolving checkout errors, payment timeouts, and high friction steps.',
      status: 'APPROVED'
    }
  });

  const roadmapQ4 = await prisma.productRoadmap.create({
    data: {
      projectId: project.id,
      quarter: '2026-Q4',
      title: 'Onboarding & Funnel Experience Overhaul',
      description: 'Optimize user profile creation flow and onboarding step completion speeds.',
      status: 'DRAFT'
    }
  });
  console.log('  ✓ Created Roadmaps for 2026-Q3 and Q4');

  // 4. Create Initiatives
  const init1 = await prisma.productInitiative.create({
    data: {
      projectId: project.id,
      objectiveId: obj1.id,
      roadmapId: roadmapQ3.id,
      title: 'Redesign Checkout Payment Form Fields',
      description: 'Rebuild payment info form with inline validation, clear error status warnings, and dynamic help prompts.',
      owner: 'siddhant@fricta.ai',
      status: 'APPROVED',
      strategicScore: 82.5,
      userImpactScore: 90.0,
      survivabilityScore: 85.0,
      riskScore: 78.0,
      effortScore: 4.0,
      complexity: 'MEDIUM',
      targetQuarter: '2026-Q3'
    }
  });

  const init2 = await prisma.productInitiative.create({
    data: {
      projectId: project.id,
      objectiveId: obj2.id,
      roadmapId: roadmapQ4.id,
      title: 'Streamline Step 4 Profile Creation Funnel',
      description: 'Reduce onboarding forms to only required fields; defer social linking to post-registration to solve dropoffs.',
      owner: 'alex@fricta.ai',
      status: 'PROPOSED',
      strategicScore: 68.0,
      userImpactScore: 75.0,
      survivabilityScore: 70.0,
      riskScore: 60.0,
      effortScore: 6.0,
      complexity: 'HIGH',
      targetQuarter: '2026-Q4'
    }
  });

  const init3 = await prisma.productInitiative.create({
    data: {
      projectId: project.id,
      objectiveId: obj1.id,
      roadmapId: roadmapQ3.id,
      title: 'Autosave Checkout Payment Methods Locally',
      description: 'Persist sandbox checkout states dynamically to prevent input losses on network failures.',
      owner: 'sarah@fricta.ai',
      status: 'UNDER_REVIEW',
      strategicScore: 74.2,
      userImpactScore: 80.0,
      survivabilityScore: 72.0,
      riskScore: 65.0,
      effortScore: 2.0,
      complexity: 'LOW',
      targetQuarter: '2026-Q3'
    }
  });
  console.log('  ✓ Created 3 Product Initiatives');

  // 5. Create Initiative Evidence
  await prisma.initiativeEvidence.create({
    data: {
      initiativeId: init1.id,
      evidenceType: 'ANOMALY',
      referenceId: anomaly.id,
      description: `Linked to active Rage Click Spike anomaly in payment submit CTA (${anomaly.description})`
    }
  });

  await prisma.initiativeEvidence.create({
    data: {
      initiativeId: init1.id,
      evidenceType: 'INVESTIGATION',
      referenceId: thread.id,
      description: `Derived from Checkout Friction Deep Dive discussion thread (${thread.title})`
    }
  });

  await prisma.initiativeEvidence.create({
    data: {
      initiativeId: init2.id,
      evidenceType: 'SIGNAL',
      referenceId: 'sig_onboarding_dropoff',
      description: '59% user dropoff rate detected at Step 4 on profile setup page via longitudinal engine'
    }
  });
  console.log('  ✓ Created Initiative Evidence links');

  // 6. Create Strategic Risks
  await prisma.strategicRisk.create({
    data: {
      initiativeId: init1.id,
      riskType: 'RESOURCE',
      description: 'Backend payment gateway integration depends on external processor API updates.',
      severity: 'HIGH',
      mitigationPlan: 'Coordinate gateway contract alignment early and establish standard mock adapters.'
    }
  });

  await prisma.strategicRisk.create({
    data: {
      initiativeId: init2.id,
      riskType: 'COMPLEXITY',
      description: 'Legacy auth systems require refactoring to support deferred profile setups.',
      severity: 'CRITICAL',
      mitigationPlan: 'Isolate session caching tokens using standard session storage encryption.'
    }
  });
  console.log('  ✓ Created Strategic Risks');

  // 7. Create Opportunity Scores
  await prisma.opportunityScore.create({
    data: {
      projectId: project.id,
      title: 'Optimize Checkout Flow Efficiency',
      reachScore: 85.0,
      impactScore: 90.0,
      confidenceScore: 88.0,
      effortScore: 4.0,
      overallScore: 82.5
    }
  });

  await prisma.opportunityScore.create({
    data: {
      projectId: project.id,
      title: 'Enhance User Acquisition & Onboarding',
      reachScore: 70.0,
      impactScore: 75.0,
      confidenceScore: 72.0,
      effortScore: 6.0,
      overallScore: 68.0
    }
  });
  console.log('  ✓ Created Opportunity Scores');

  // 8. Create Executive Metrics
  await prisma.executiveMetric.create({
    data: {
      projectId: project.id,
      metricName: 'product_health_index',
      value: 84.5,
      targetValue: 90.0,
      trend: 'UP'
    }
  });

  await prisma.executiveMetric.create({
    data: {
      projectId: project.id,
      metricName: 'strategic_risk_index',
      value: 34.0,
      targetValue: 20.0,
      trend: 'DOWN'
    }
  });
  console.log('  ✓ Created Executive Metrics');

  // 9. Create Product Health Snapshots
  const baseTime = Date.now();
  for (let i = 0; i < 6; i++) {
    const time = new Date(baseTime - i * 24 * 60 * 60 * 1000 * 5); // every 5 days
    await prisma.productHealthSnapshot.create({
      data: {
        projectId: project.id,
        productHealthScore: 78.0 + i * 1.5,
        strategicRiskScore: 45.0 - i * 2.0,
        uxHealthScore: 80.0 + i * 1.0,
        opportunityPipelineCount: 5 + i,
        activeInitiativesCount: 3,
        recordedAt: time
      }
    });
  }
  console.log('  ✓ Created Product Health Snapshots');

  console.log('🎉 Product Strategy Intelligence seeding completed successfully!');
}

seedProductStrategy()
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
