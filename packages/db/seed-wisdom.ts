import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { prisma } from './src/index';

async function seedWisdom() {
  console.log('🌱 Seeding Phase 14 Part 4: Institutional Intelligence & Wisdom...');

  const project = await prisma.project.findFirst();
  if (!project) {
    console.error('❌ No project found. Run other phase seeders first.');
    process.exit(1);
  }
  console.log(`  → Using project: ${project.projectName} (${project.id})`);

  if (project.workspaceId) {
    const link = await prisma.workspaceProject.findFirst({
      where: {
        workspaceId: project.workspaceId,
        projectId: project.id,
      },
    });
    if (!link) {
      await prisma.workspaceProject.create({
        data: {
          workspaceId: project.workspaceId,
          projectId: project.id,
        },
      });
      console.log(`  ✓ Linked project "${project.projectName}" to workspace "${project.workspaceId}" in WorkspaceProject join table.`);
    }
  }

  console.log('  → Cleaning old wisdom records...');
  await prisma.wisdomSnapshot.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.wisdomEvidence.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.institutionalLesson.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.organizationalPrinciple.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.wisdomRecord.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.historicalSynthesis.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.longTermTrend.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.strategicLearning.deleteMany({ where: { projectId: project.id } }).catch(() => {});

  console.log('  → Seeding Institutional Lessons...');
  const l1 = await prisma.institutionalLesson.create({
    data: {
      projectId: project.id,
      title: 'Friction-minimization onboarding success pattern',
      summary: 'Simplifying form validation fields and pre-warming checkout caching yields conversions.',
      lessonType: 'UX',
      content: 'Observed that projects deploying auto-completion verification modules achieve faster conversion lifts and lower checkout rage clicks.',
      impactScore: 8.8,
      occurrences: 14,
      timespanMonths: 18
    }
  });

  const l2 = await prisma.institutionalLesson.create({
    data: {
      projectId: project.id,
      title: 'Strategic ownership and evidence verification rules',
      summary: 'High-risk strategic roadmaps lacking early review cycles consistently face deployment gaps.',
      lessonType: 'STRATEGIC',
      content: 'Determined that roadmaps prioritizing RICE metrics backed by direct user session comments achieve higher execution velocity.',
      impactScore: 7.9,
      occurrences: 5,
      timespanMonths: 12
    }
  });

  console.log('  → Seeding Grounding Trace Evidence...');
  const histCase = await prisma.historicalCase.findFirst({ where: { projectId: project.id } });
  const outcome = await prisma.productOutcome.findFirst({ where: { projectId: project.id } });
  const kpi = await prisma.productKPI.findFirst({ where: { projectId: project.id } });

  if (histCase) {
    await prisma.wisdomEvidence.create({
      data: {
        projectId: project.id,
        lessonId: l1.id,
        evidenceType: 'HISTORICAL_CASE',
        referenceId: histCase.id,
        description: `Grounding case study: "${histCase.title}" achieved conversion lifts.`
      }
    });
  }

  if (outcome) {
    await prisma.wisdomEvidence.create({
      data: {
        projectId: project.id,
        lessonId: l1.id,
        evidenceType: 'OUTCOME_VERDICT',
        referenceId: outcome.id,
        description: `Grounding outcome evaluation: Attributed outcome verdict for "${outcome.title}".`
      }
    });

    await prisma.wisdomEvidence.create({
      data: {
        projectId: project.id,
        lessonId: l2.id,
        evidenceType: 'OUTCOME_VERDICT',
        referenceId: outcome.id,
        description: `Attributed outcome analysis: "${outcome.title}" demonstrates strategic validation values.`
      }
    });
  }

  if (kpi) {
    await prisma.wisdomEvidence.create({
      data: {
        projectId: project.id,
        lessonId: l1.id,
        evidenceType: 'KPI_TREND',
        referenceId: kpi.id,
        description: `Target KPI alignment: "${kpi.name}" composite health metric.`
      }
    });
  }

  console.log('  → Seeding Wisdom Records with Metadata...');
  const wData1 = {
    lessonType: 'UX',
    confidence: 'HIGH',
    firstObserved: new Date(Date.now() - 18 * 30 * 24 * 60 * 60 * 1000).toISOString(),
    lastObserved: new Date().toISOString(),
    supportingCases: 14,
    evidenceCount: 3,
    outcomeReferences: outcome ? [outcome.id] : [],
    kpiReferences: kpi ? [kpi.id] : [],
    validationMethod: 'Deterministic historical outcomes aggregation and telemetry proof verification',
    auditTrail: ['Initial synthesis logged by seeder.']
  };

  await prisma.wisdomRecord.create({
    data: {
      projectId: project.id,
      category: 'OPERATIONAL',
      title: 'Friction-minimization onboarding success pattern',
      description: 'Simplifying form validation fields and pre-warming checkout caching yields conversions.',
      wisdomData: JSON.parse(JSON.stringify(wData1))
    }
  });

  console.log('  → Seeding Organizational Principles...');
  await prisma.organizationalPrinciple.create({
    data: {
      projectId: project.id,
      statement: 'Frictionless onboarding flows consistently decrease registration drop-offs',
      description: 'Successful onboarding initiatives historically reduced required fields, shortened time-to-value, and simplified form verification layouts.',
      principleType: 'SUCCESS_PATTERN',
      supportRate: 0.88,
      isVerified: true
    }
  });

  await prisma.organizationalPrinciple.create({
    data: {
      projectId: project.id,
      statement: 'High-risk initiatives regularly correlate with skipped evidence validation',
      description: 'Strategic initiatives that proceeded without linking telemetry evidence or historical case review files consistently regressed target KPIs.',
      principleType: 'FAILURE_PATTERN',
      supportRate: 0.75,
      isVerified: true
    }
  });

  console.log('  → Seeding Historical Syntheses...');
  await prisma.historicalSynthesis.create({
    data: {
      projectId: project.id,
      title: 'FY2026 Q2 Institutional Synthesis Report',
      summary: 'Consolidated review of quarterly UX anomalies, strategic allocations, and attributions outcomes.',
      synthesisType: 'QUARTERLY',
      details: JSON.parse(JSON.stringify({
        lessonsTracked: 2,
        principlesVerified: 2,
        totalTelemetrySessionsAudited: 8400,
        macroProductHealthIndex: 82.5,
        complianceRate: 0.94,
        findings: [
          'Onboarding step completion showed a substantial positive delta following Redis caching additions.',
          'Compliance audits flagged resource access scopes as needing tighter governance isolation.',
          'High-effort roadmaps lacking evidence reviews consistently suffered from delay slippages.'
        ]
      }))
    }
  });

  console.log('  → Seeding Long-Term Trends...');
  await prisma.longTermTrend.create({
    data: {
      projectId: project.id,
      metricName: 'Onboarding Funnel Completion Rate',
      direction: 'IMPROVING',
      description: 'Positive 90-day baseline improvements driven by verification flow optimizations.',
      changePercent: 15.4,
      timespanDays: 90
    }
  });

  await prisma.longTermTrend.create({
    data: {
      projectId: project.id,
      metricName: 'Telemetry Rage Click Incident Rate',
      direction: 'DEGRADED',
      description: 'Gradual 180-day escalation of unresolved verification loops on legacy mobile screens.',
      changePercent: -8.2,
      timespanDays: 180
    }
  });

  console.log('  → Seeding Strategic Learnings...');
  await prisma.strategicLearning.create({
    data: {
      projectId: project.id,
      title: 'Evidence-centric prioritizations maximize quarterly roadmap yield rates',
      description: 'Deploying RICE filters with dynamic UX evidence score boosts results in 22% higher sprint completion rates.',
      learningType: 'EXECUTIVE',
      impactRating: 8.5
    }
  });

  console.log('  → Seeding Wisdom Snapshots...');
  await prisma.wisdomSnapshot.create({
    data: {
      projectId: project.id,
      lessonsCount: 2,
      principlesCount: 2,
      snapshotData: JSON.parse(JSON.stringify({
        lessons: [l1, l2],
        trendsCount: 2
      }))
    }
  });

  console.log('🏁 Phase 14 Part 4: Seeding completed successfully!');
}

seedWisdom()
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
