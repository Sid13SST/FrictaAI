import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { prisma } from './src/index';

async function seedForecasting() {
  console.log('🌱 Seeding Phase 14 Part 3: Organizational Forecasting & Scenario Intelligence...');

  const project = await prisma.project.findFirst();
  if (!project) {
    console.error('❌ No project found. Run other phase seeders first.');
    process.exit(1);
  }
  console.log(`  → Using project: ${project.projectName} (${project.id})`);

  console.log('  → Cleaning old forecasting records...');
  await prisma.forecastSnapshot.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.confidenceRecord.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.emergingRisk.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.forecastAssumption.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.scenarioOutcome.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.scenarioAnalysis.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.strategicForecastEvidence.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.forecastRecord.deleteMany({ where: { projectId: project.id } }).catch(() => {});

  console.log('  → Seeding Forecast Records...');
  const f1 = await prisma.forecastRecord.create({
    data: {
      projectId: project.id,
      forecastType: 'KPI',
      targetEntityId: 'kpi-onboarding',
      targetEntityName: 'Onboarding Completion Rate',
      metricName: 'Completion Rate',
      currentValue: 0.65,
      projectedValue: 0.78,
      lowerBound: 0.70,
      upperBound: 0.85,
      confidence: 0.82,
      targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days out
    }
  });

  const f2 = await prisma.forecastRecord.create({
    data: {
      projectId: project.id,
      forecastType: 'PRODUCT_HEALTH',
      targetEntityId: 'ph-consolidated',
      targetEntityName: 'Consolidated Product Health Index',
      metricName: 'Composite Score',
      currentValue: 78.0,
      projectedValue: 84.0,
      lowerBound: 76.0,
      upperBound: 90.0,
      confidence: 0.75,
      targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    }
  });

  console.log('  → Seeding Forecast Evidence...');
  // Find a historical case if available
  const histCase = await prisma.historicalCase.findFirst({ where: { projectId: project.id } });
  const learningPat = await prisma.learningPattern.findFirst({ where: { projectId: project.id } });

  if (histCase) {
    await prisma.strategicForecastEvidence.create({
      data: {
        projectId: project.id,
        forecastId: f1.id,
        evidenceType: 'HISTORICAL_CASE',
        referenceId: histCase.id,
        description: `Grounding evidence: Similar strategic changes in the "${histCase.title}" initiative achieved a conversion increase of ${histCase.successRate * 100}%.`
      }
    });
  }

  if (learningPat) {
    await prisma.strategicForecastEvidence.create({
      data: {
        projectId: project.id,
        forecastId: f1.id,
        evidenceType: 'HISTORICAL_PATTERN',
        referenceId: learningPat.id,
        description: `Grounding evidence: Pattern detector verified "${learningPat.patternName}" occurs during onboarding with ${learningPat.occurrences} instances.`
      }
    });
  }

  console.log('  → Seeding Forecast Assumptions...');
  await prisma.forecastAssumption.create({
    data: {
      projectId: project.id,
      forecastId: f1.id,
      statement: 'Pre-warming Redis database queries for analytics metrics is active.',
      validityStatus: 'VALID',
      impactLevel: 'HIGH'
    }
  });

  await prisma.forecastAssumption.create({
    data: {
      projectId: project.id,
      forecastId: f1.id,
      statement: 'Marketing channels maintain standard cohort traffic quality.',
      validityStatus: 'UNKNOWN',
      impactLevel: 'MEDIUM'
    }
  });

  console.log('  → Seeding Emerging Risks...');
  await prisma.emergingRisk.create({
    data: {
      projectId: project.id,
      riskType: 'KPI_RISK',
      title: 'Checkout Conversion Rate Slip',
      description: 'Transaction conversion KPI showing warning signs of dropping below the 70% threshold.',
      severity: 8.5,
      probability: 0.65,
      triggerCondition: 'Conversion rate < 0.70',
      isDetected: true,
      detectedAt: new Date()
    }
  });

  await prisma.emergingRisk.create({
    data: {
      projectId: project.id,
      riskType: 'UX_RISK',
      title: 'Step 3 Verification Rage-Click Spike',
      description: 'Spikes in user click speed detected on verification forms.',
      severity: 7.2,
      probability: 0.80,
      triggerCondition: 'Rage click instances > 5',
      isDetected: true,
      detectedAt: new Date()
    }
  });

  console.log('  → Seeding Confidence Records...');
  await prisma.confidenceRecord.create({
    data: {
      projectId: project.id,
      forecastId: f1.id,
      score: 0.82,
      explanation: 'High confidence based on successful onboarding V2 implementation (+15% conversion) and step 3 details verification friction remediation.',
      factors: JSON.parse(JSON.stringify({ historicalCasesMatched: 1, assumptionsValid: 1 }))
    }
  });

  console.log('  → Seeding Scenario Analyses...');
  const s1 = await prisma.scenarioAnalysis.create({
    data: {
      projectId: project.id,
      scenarioType: 'BEST_CASE',
      title: 'Optimistic Onboarding Completion lift',
      description: 'Simulates full compliance adoption and form auto-complete optimization yields.',
      parameters: JSON.parse(JSON.stringify({ onboardingOptimized: true, completionLift: 0.20 }))
    }
  });

  await prisma.scenarioOutcome.create({
    data: {
      projectId: project.id,
      scenarioId: s1.id,
      metricName: 'Onboarding Completion Rate',
      projectedValue: 0.85,
      deltaPercent: 20.0,
      description: 'Frictionless form transitions and autocomplete boosts.'
    }
  });

  console.log('  → Creating Forecast Snapshot...');
  await prisma.forecastSnapshot.create({
    data: {
      projectId: project.id,
      forecastCount: 2,
      riskCount: 2,
      snapshotData: JSON.parse(JSON.stringify({
        forecasts: [f1, f2],
        risksCount: 2
      }))
    }
  });

  console.log('🏁 Phase 14 Part 3: Seeding completed successfully!');
}

seedForecasting()
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
