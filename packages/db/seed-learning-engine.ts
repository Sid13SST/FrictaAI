import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { prisma } from './src/index';

async function seedLearningEngine() {
  console.log('🌱 Seeding Phase 14 Part 2: Organizational Learning Engine...');

  const project = await prisma.project.findFirst();
  if (!project) {
    console.error('❌ No project found. Run other phase seeders first.');
    process.exit(1);
  }
  console.log(`  → Using project: ${project.projectName} (${project.id})`);

  console.log('  → Cleaning old learning engine records...');
  await prisma.learningSnapshot.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.patternEvidence.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.recurrenceRecord.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.organizationalLesson.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.successPattern.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.failurePattern.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.historicalCase.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.learningPattern.deleteMany({ where: { projectId: project.id } }).catch(() => {});

  console.log('  → Seeding Historical Cases...');
  const case1 = await prisma.historicalCase.create({
    data: {
      projectId: project.id,
      title: 'Workflow Onboarding V2 Initiative',
      description: 'Streamlined onboarding sequence mapping tooltips to primary navigation CTA elements.',
      caseType: 'SUCCESS',
      outcomeValue: 15.2,
      successRate: 0.85,
      failureRate: 0.15
    }
  });

  const case2 = await prisma.historicalCase.create({
    data: {
      projectId: project.id,
      title: 'R&D Multi-tenant Deployment Platform',
      description: 'Distributed orchestration layer scaling workspace replication limits.',
      caseType: 'SUCCESS',
      outcomeValue: 24.5,
      successRate: 0.92,
      failureRate: 0.08
    }
  });

  const case3 = await prisma.historicalCase.create({
    data: {
      projectId: project.id,
      title: 'Checkout Gateway Legacy Migration',
      description: 'Replacing standard Stripe integrations with native multi-currency tokenization.',
      caseType: 'FAILURE',
      outcomeValue: -4.8,
      successRate: 0.38,
      failureRate: 0.62
    }
  });

  console.log('  → Seeding Learning Patterns & Evidences...');
  const pat1 = await prisma.learningPattern.create({
    data: {
      projectId: project.id,
      patternName: 'Repeated Onboarding Failure Pattern',
      patternType: 'FAILURE',
      description: 'Users consistently abandon the onboarding flow at Step 3 (Details Verification) due to slow form response.',
      confidence: 0.94,
      occurrences: 14
    }
  });

  await prisma.patternEvidence.create({
    data: {
      projectId: project.id,
      patternId: pat1.id,
      evidenceType: 'REPLAY',
      referenceId: 'session-onboarding-abandon-1',
      description: 'User exited onboarding step 3 after 45 seconds of input inactivity.'
    }
  });

  await prisma.patternEvidence.create({
    data: {
      projectId: project.id,
      patternId: pat1.id,
      evidenceType: 'TELEMETRY',
      referenceId: 'telemetry-form-exit-rate',
      description: 'Onboarding step 3 form exit rate anomaly spike: 28% deviation.'
    }
  });

  const pat2 = await prisma.learningPattern.create({
    data: {
      projectId: project.id,
      patternName: 'Automated Cache Warming Performance Win',
      patternType: 'SUCCESS',
      description: 'Pre-warming Redis database queries for analytics metrics yields lower Largest Contentful Paint (LCP) times.',
      confidence: 0.92,
      occurrences: 8
    }
  });

  await prisma.patternEvidence.create({
    data: {
      projectId: project.id,
      patternId: pat2.id,
      evidenceType: 'KPI_HISTORICAL',
      referenceId: 'kpi-lcp-metric',
      description: 'LCP metric baseline drops from 2.8s to 1.4s after cache warming integration.'
    }
  });

  console.log('  → Seeding Success Patterns...');
  const sp1 = await prisma.successPattern.create({
    data: {
      projectId: project.id,
      title: 'Proactive Form Auto-complete Lift',
      description: 'Adding autofill triggers to address forms reduced checkout abandonment by 18%.',
      winCategory: 'FRICTION_REDUCTION',
      impactScore: 18.4
    }
  });

  console.log('  → Seeding Failure Patterns...');
  const fp1 = await prisma.failurePattern.create({
    data: {
      projectId: project.id,
      title: 'Checkout Gateway Form Exits',
      description: 'High exit rates observed when card token validation takes longer than 4.5 seconds.',
      mistakeType: 'FORM_EXIT',
      impactScore: 7.5
    }
  });

  console.log('  → Seeding Organizational Lessons...');
  await prisma.organizationalLesson.create({
    data: {
      projectId: project.id,
      title: 'Win: Proactive Form Auto-complete Lift',
      summary: 'Adding autofill triggers to address forms reduced checkout abandonment by 18%.',
      lessonType: 'WIN',
      impactScore: 18.4,
      evidence: JSON.parse(JSON.stringify({ successPatternId: sp1.id }))
    }
  });

  await prisma.organizationalLesson.create({
    data: {
      projectId: project.id,
      title: 'Mistake: Checkout Gateway Form Exits',
      summary: 'High exit rates observed when card token validation takes longer than 4.5 seconds.',
      lessonType: 'MISTAKE',
      impactScore: 7.5,
      evidence: JSON.parse(JSON.stringify({ failurePatternId: fp1.id }))
    }
  });

  console.log('  → Creating Initial Learning Snapshot...');
  await prisma.learningSnapshot.create({
    data: {
      projectId: project.id,
      patternCount: 2,
      lessonCount: 2,
      snapshotData: JSON.parse(JSON.stringify({
        patterns: [pat1, pat2],
        cases: [case1, case2, case3]
      }))
    }
  });

  console.log('🏁 Phase 14 Part 2: Organizational Learning Engine seeding completed successfully!');
}

seedLearningEngine()
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
