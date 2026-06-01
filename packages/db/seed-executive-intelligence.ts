import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { prisma } from './src/index';

async function seedExecutiveIntelligence() {
  console.log('🌱 Seeding Phase 13 Part 4: Executive Decision Intelligence & Product Governance data...');

  const project = await prisma.project.findFirst();
  if (!project) {
    console.error('❌ No project found. Please seed a project first.');
    process.exit(1);
  }
  console.log(`  → Using project: ${project.projectName} (${project.id})`);

  // 1. Clear existing Phase 13 Part 4 data to prevent duplicates
  console.log('  → Cleaning old executive intelligence records...');
  await prisma.decisionOutcome.deleteMany({ where: { decision: { recommendation: { projectId: project.id } } } }).catch(() => {});
  await prisma.decisionRecord.deleteMany({ where: { recommendation: { projectId: project.id } } }).catch(() => {});
  await prisma.executiveEvidence.deleteMany({ where: { recommendation: { projectId: project.id } } }).catch(() => {});
  await prisma.executiveRecommendation.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.governanceReview.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.strategicRiskRecord.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.executiveHealthSnapshot.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.governancePolicyReview.deleteMany({ where: { projectId: project.id } }).catch(() => {});

  // 2. Fetch existing relations for evidence traceability
  const objectives = await prisma.strategicObjective.findMany({ where: { projectId: project.id } });
  const initiatives = await prisma.productInitiative.findMany({ where: { projectId: project.id } });
  const kpis = await prisma.productKPI.findMany({ where: { projectId: project.id } });
  const outcomes = await prisma.productOutcome.findMany({ where: { projectId: project.id } });
  const anomalies = await prisma.uXAnomaly.findMany({ where: { projectId: project.id } });
  const sessions = await prisma.workflowSession.findMany({ where: { projectId: project.id } });

  // 3. Seed Governance Policy Reviews
  console.log('  → Seeding workspace policies...');
  await prisma.governancePolicyReview.create({
    data: {
      projectId: project.id,
      policyName: 'Workspace Access Control & Role Boundaries',
      complianceRate: 100.0,
      status: 'PASSED'
    }
  });

  await prisma.governancePolicyReview.create({
    data: {
      projectId: project.id,
      policyName: 'Immutable System Audit logging',
      complianceRate: 80.0,
      status: 'PASSED'
    }
  });

  const privacyReview = await prisma.governancePolicyReview.create({
    data: {
      projectId: project.id,
      policyName: 'User Telemetry PII Masking & Local Consent',
      complianceRate: 60.0,
      status: 'WARNING'
    }
  });
  console.log('  ✓ Governance Policy reviews seeded.');

  // 4. Seed Initiative Compliance Reviews
  console.log('  → Seeding initiative compliance audits...');
  for (const init of initiatives) {
    let verdict = 'COMPLIANT';
    let details = 'Initiative complies with strategy guidelines. Objective is mapped and owner is assigned.';
    if (!init.owner) {
      verdict = 'WARNING';
      details = 'Initiative requires review: Missing owner assignment details.';
    } else if (!init.objectiveId) {
      verdict = 'NON_COMPLIANT';
      details = 'Initiative is non-compliant: Missing mapped Strategic Objective link.';
    }

    await prisma.governanceReview.create({
      data: {
        projectId: project.id,
        reviewType: 'INITIATIVE',
        targetId: init.id,
        verdict,
        details,
        reviewedBy: 'Fricta Compliance Auditor'
      }
    });
  }
  console.log('  ✓ Initiative compliance audits seeded.');

  // 5. Seed Strategic Risks
  console.log('  → Seeding strategic risks...');
  await prisma.strategicRiskRecord.create({
    data: {
      projectId: project.id,
      riskSource: 'UX',
      title: 'Unmitigated Critical UX Friction Hotspots',
      description: 'Active critical UX anomalies exist in checkout/payment funnels but lack resolved roadmap remits.',
      severity: 'CRITICAL',
      probability: 0.85,
      impact: 0.90,
      compositeScore: 76.5,
      status: 'MONITORED'
    }
  });

  await prisma.strategicRiskRecord.create({
    data: {
      projectId: project.id,
      riskSource: 'INITIATIVE',
      title: 'High Complexity Roadmap Slippage Risk',
      description: 'Active checkout form redesign initiatives are marked high-complexity or depend on external APIs.',
      severity: 'HIGH',
      probability: 0.70,
      impact: 0.75,
      compositeScore: 52.5,
      status: 'MONITORED'
    }
  });
  console.log('  ✓ Strategic Risk center records seeded.');

  // 6. Seed Executive Health Snapshots History
  console.log('  → Seeding health snapshot history...');
  const baseTime = Date.now();
  for (let i = 0; i < 6; i++) {
    const recordedAt = new Date(baseTime - i * 5 * 24 * 60 * 60 * 1000);
    const prod = 80.0 + i * 1.5;
    const strat = 75.0 + i * 2.0;
    const port = 82.0 + i * 1.0;
    const ux = 85.0 - i * 1.5;
    const kpi = 86.0 + i * 0.8;
    const comp = (prod * 0.25) + (strat * 0.25) + (port * 0.2) + (ux * 0.15) + (kpi * 0.15);

    await prisma.executiveHealthSnapshot.create({
      data: {
        projectId: project.id,
        productHealth: prod,
        strategicHealth: strat,
        portfolioHealth: port,
        uxHealth: ux,
        kpiHealth: kpi,
        compositeHealth: comp,
        recordedAt
      }
    });
  }
  console.log('  ✓ Health trend history seeded.');

  // 7. Seed Recommendations and evidence chains (Fully trace-linked!)
  console.log('  → Seeding executive recommendations & evidence paths...');
  const rec1 = await prisma.executiveRecommendation.create({
    data: {
      projectId: project.id,
      title: 'Remediate Checkout Gateway Payment Friction',
      description: 'Deploy adaptive inline input assistance on credit card fields and configure sandbox fallback endpoints to resolve checkout form drops.',
      recommendationType: 'INITIATIVE',
      priority: 'CRITICAL',
      status: 'ACTIVE'
    }
  });

  const evidence = [];

  // Traced to initiative
  const checkoutInit = initiatives.find(i => i.title.includes('Checkout'));
  if (checkoutInit) {
    const ev = await prisma.executiveEvidence.create({
      data: {
        recommendationId: rec1.id,
        evidenceType: 'INITIATIVE',
        referenceId: checkoutInit.id,
        description: `Traced to active roadmap initiative: "${checkoutInit.title}".`
      }
    });
    evidence.push(ev);
  }

  // Traced to objective
  const checkoutObj = objectives.find(o => o.title.includes('Checkout'));
  if (checkoutObj) {
    const ev = await prisma.executiveEvidence.create({
      data: {
        recommendationId: rec1.id,
        evidenceType: 'KPI', // maps to strategic objective target metric
        referenceId: checkoutObj.id,
        description: `Satisfies objective: "${checkoutObj.title}" aiming for target metric "${checkoutObj.targetMetric}".`
      }
    });
    evidence.push(ev);
  }

  // Traced to KPI
  const checkoutKpi = kpis.find(k => k.metricKey === 'checkout_survivability');
  if (checkoutKpi) {
    const ev = await prisma.executiveEvidence.create({
      data: {
        recommendationId: rec1.id,
        evidenceType: 'KPI',
        referenceId: checkoutKpi.id,
        description: `Tracks KPI metric: "${checkoutKpi.name}" (Current: ${checkoutKpi.currentValue}%, Target: ${checkoutKpi.targetValue}%).`
      }
    });
    evidence.push(ev);
  }

  // Traced to outcome evaluation
  const checkoutOutcome = outcomes[0];
  if (checkoutOutcome) {
    const ev = await prisma.executiveEvidence.create({
      data: {
        recommendationId: rec1.id,
        evidenceType: 'OUTCOME',
        referenceId: checkoutOutcome.id,
        description: `Aims to replicate successful outcomes logged in previous phases: "${checkoutOutcome.title}".`
      }
    });
    evidence.push(ev);
  }

  // Traced to active anomaly
  const checkoutAnom = anomalies.find(a => a.anomalyType.includes('CLICK') || a.anomalyType.includes('SPIKE'));
  if (checkoutAnom) {
    const ev = await prisma.executiveEvidence.create({
      data: {
        recommendationId: rec1.id,
        evidenceType: 'UX_ANOMALY',
        referenceId: checkoutAnom.id,
        description: `Mitigates active critical UX anomaly: "${checkoutAnom.anomalyType}" (${checkoutAnom.description}).`
      }
    });
    evidence.push(ev);
  }

  // Traced to user replay session logs
  const checkoutSession = sessions[0];
  if (checkoutSession) {
    const ev = await prisma.executiveEvidence.create({
      data: {
        recommendationId: rec1.id,
        evidenceType: 'REPLAY',
        referenceId: checkoutSession.id,
        description: `Inspectable user session replay logs: Session ID ${checkoutSession.id}.`
      }
    });
    evidence.push(ev);
  }

  // Save evidence count
  await prisma.executiveRecommendation.update({
    where: { id: rec1.id },
    data: { evidenceCount: evidence.length }
  });
  console.log(`  ✓ Recommendation 1 seeded with ${evidence.length} trace evidence nodes.`);

  // Recommendation 2: Address telemetry masking warnings
  const rec2 = await prisma.executiveRecommendation.create({
    data: {
      projectId: project.id,
      title: 'Deploy Telemetry Masking Auditing Controls',
      description: 'Audit telemetry input masking rules to resolve compliance warnings and verify masking consents are logged in telemetry audits.',
      recommendationType: 'RISK',
      priority: 'HIGH',
      status: 'ACTIVE'
    }
  });

  const ev2 = await prisma.executiveEvidence.create({
    data: {
      recommendationId: rec2.id,
      evidenceType: 'INVESTIGATION',
      referenceId: privacyReview.id,
      description: `Triggered by failed policy review check on "${privacyReview.policyName}".`
    }
  });

  await prisma.executiveRecommendation.update({
    where: { id: rec2.id },
    data: { evidenceCount: 1 }
  });
  console.log(`  ✓ Recommendation 2 seeded with 1 evidence node.`);

  // 8. Seed Historical Decision Records & expected outcomes (Approved Decision example)
  console.log('  → Seeding historical decisions & expected outcomes...');
  const user = await prisma.user.findFirst();
  if (user) {
    const rec3 = await prisma.executiveRecommendation.create({
      data: {
        projectId: project.id,
        title: 'Improve Signup Page Validation Feedback',
        description: 'Implement dynamic, inline input validation messages on the registration screen to prevent sign-up flow dropoffs.',
        recommendationType: 'INITIATIVE',
        priority: 'MEDIUM',
        status: 'APPROVED'
      }
    });

    const decision = await prisma.decisionRecord.create({
      data: {
        recommendationId: rec3.id,
        userId: user.id,
        action: 'APPROVE',
        notes: 'Approved via Q3 strategic review. Essential for registration conversion conversion.'
      }
    });

    await prisma.decisionOutcome.create({
      data: {
        decisionId: decision.id,
        metricKey: 'onboarding_activation',
        expectedDelta: 5.0,
        actualDelta: 5.2,
        status: 'TARGET_ACHIEVED',
        measuredAt: new Date()
      }
    });

    console.log('  ✓ Historical decision audit trails seeded.');
  }

  console.log('🏁 Phase 13 Part 4: Executive Decision Intelligence seeding completed successfully!');
}

seedExecutiveIntelligence()
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
