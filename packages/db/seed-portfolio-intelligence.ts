import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { prisma } from './src/index';

async function seedPortfolioIntelligence() {
  console.log('🌱 Seeding Phase 13 Part 3: Product Portfolio Intelligence & Organizational Alignment data...');

  const project = await prisma.project.findFirst();
  if (!project) {
    console.error('❌ No project found. Please seed a project first (e.g., seed-product-strategy.ts).');
    process.exit(1);
  }
  console.log(`  → Using project: ${project.projectName} (${project.id})`);

  // 1. Clear existing Phase 13 Part 3 data
  console.log('  → Cleaning old portfolio intelligence records...');
  await prisma.portfolioObjective.deleteMany({ where: { portfolio: { projectId: project.id } } }).catch(() => {});
  await prisma.alignmentRecord.deleteMany({ where: { portfolio: { projectId: project.id } } }).catch(() => {});
  await prisma.strategicGap.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.dependencyRecord.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.portfolioHealthSnapshot.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.investmentAllocation.deleteMany({ where: { portfolio: { projectId: project.id } } }).catch(() => {});
  await prisma.organizationalRisk.deleteMany({ where: { portfolio: { projectId: project.id } } }).catch(() => {});
  await prisma.portfolio.deleteMany({ where: { projectId: project.id } }).catch(() => {});

  // 2. Fetch existing Strategic Objectives & Initiatives
  const objectives = await prisma.strategicObjective.findMany({ where: { projectId: project.id } });
  const initiatives = await prisma.productInitiative.findMany({ where: { projectId: project.id } });

  if (objectives.length === 0 || initiatives.length === 0) {
    console.error('❌ Missing prerequisites. Please ensure strategic objectives and initiatives are seeded.');
    process.exit(1);
  }

  // 3. Create Portfolios
  const mainPortfolio = await prisma.portfolio.create({
    data: {
      projectId: project.id,
      name: 'Global Platform Strategy & Customer Experience',
      description: 'High-priority core customer flow alignment, security compliance, and acquisition initiatives.',
      status: 'ACTIVE'
    }
  });
  console.log(`  ✓ Created Portfolio: ${mainPortfolio.name}`);

  // 4. Link Objectives to Portfolio
  for (const obj of objectives) {
    await prisma.portfolioObjective.create({
      data: {
        portfolioId: mainPortfolio.id,
        objectiveId: obj.id
      }
    });
    console.log(`  ✓ Mapped Strategic Objective to Portfolio: ${obj.title}`);
  }

  // 5. Create Investment Allocations
  const allocationCategories = [
    { category: 'R_D', percentage: 35, budgetAmount: 140000 },
    { category: 'GROWTH', percentage: 40, budgetAmount: 160000 },
    { category: 'MAINTAIN', percentage: 10, budgetAmount: 40000 },
    { category: 'RISK_REDUCTION', percentage: 10, budgetAmount: 40000 },
    { category: 'SECURITY', percentage: 5, budgetAmount: 20000 }
  ];

  for (const alloc of allocationCategories) {
    await prisma.investmentAllocation.create({
      data: {
        portfolioId: mainPortfolio.id,
        category: alloc.category,
        percentage: alloc.percentage,
        budgetAmount: alloc.budgetAmount
      }
    });
  }
  console.log('  ✓ Created Investment Allocations');

  // 6. Create Dependencies between Initiatives
  // Let's check which initiatives exist
  const checkoutInit = initiatives.find(i => i.title.includes('Checkout'));
  const profileInit = initiatives.find(i => i.title.includes('Profile'));
  const autosaveInit = initiatives.find(i => i.title.includes('Autosave'));

  if (checkoutInit && autosaveInit) {
    // Autosave depends on main Checkout Payment Form redesign completion
    await prisma.dependencyRecord.create({
      data: {
        projectId: project.id,
        sourceInitiativeId: checkoutInit.id,
        targetInitiativeId: autosaveInit.id,
        dependencyType: 'BLOCKING',
        status: 'ACTIVE',
        riskScore: 78.0
      }
    });
    console.log(`  ✓ Mapped Dependency: Checkout redesign BLOCKING Autosave checkout`);
  }

  if (checkoutInit && profileInit) {
    // Checkout payment forms and step 4 profile creations are sequential
    await prisma.dependencyRecord.create({
      data: {
        projectId: project.id,
        sourceInitiativeId: checkoutInit.id,
        targetInitiativeId: profileInit.id,
        dependencyType: 'SEQUENTIAL',
        status: 'ACTIVE',
        riskScore: 45.0
      }
    });
    console.log(`  ✓ Mapped Dependency: Checkout redesign SEQUENTIAL to Profile funnel streamline`);
  }

  // 7. Create Organizational Risks
  const mockRisks = [
    {
      title: 'Payment Gateway Integration Bottleneck',
      description: 'API integration delays from external bank gateway provider risks Q3 delivery goals.',
      impactArea: 'Checkout Conversion Flow',
      probability: 65,
      impactScore: 85,
      propagatedRisk: 55.25,
      status: 'ACTIVE'
    },
    {
      title: 'Deferred Profile Security Vulnerability',
      description: 'Deferring step-session authorization token validation might expose intermediate registration endpoints.',
      impactArea: 'User Acquisition Security',
      probability: 30,
      impactScore: 90,
      propagatedRisk: 27.0,
      status: 'MONITORED'
    }
  ];

  for (const risk of mockRisks) {
    await prisma.organizationalRisk.create({
      data: {
        portfolioId: mainPortfolio.id,
        ...risk
      }
    });
  }
  console.log('  ✓ Seeded Organizational Risks');

  // 8. Create Strategic Gaps
  const mockGaps = [
    {
      gapType: 'UNCOVERED_OBJECTIVE',
      title: 'Uncovered Strategic Objective: Optimize Workspace Collaboration Latency',
      description: 'Active goal to reduce multi-user war room socket delay has no corresponding roadmap initiatives.',
      severity: 'HIGH',
      status: 'OPEN'
    },
    {
      gapType: 'UNSUPPORTED_KPI',
      title: 'Unsupported KPI: Core API Response Latency',
      description: 'Active core response latency metric has no corresponding strategic objective alignment mapping.',
      severity: 'MEDIUM',
      status: 'OPEN'
    }
  ];

  for (const gap of mockGaps) {
    await prisma.strategicGap.create({
      data: {
        projectId: project.id,
        ...gap
      }
    });
  }
  console.log('  ✓ Seeded Strategic Gaps');

  // 9. Seed PortfolioHealthSnapshots history (representing 6 weekly check-ins)
  const baseTime = Date.now();
  for (let i = 0; i < 6; i++) {
    const recordedAt = new Date(baseTime - i * 7 * 24 * 60 * 60 * 1000);
    // Over time, scores should show positive progression
    const alignment = 74.0 + i * 2.5;
    const coverage = 70.0 + i * 2.0;
    const risk = 25.0 - i * 2.0;
    const health = (alignment * 0.4) + (coverage * 0.4) + ((100 - risk) * 0.2);

    await prisma.portfolioHealthSnapshot.create({
      data: {
        projectId: project.id,
        alignmentScore: alignment,
        riskIndex: risk,
        coverageScore: coverage,
        healthRating: health,
        recordedAt
      }
    });
  }
  console.log('  ✓ Seeded Portfolio Health Snapshot trends');

  // 10. Seed Initial Alignment Records
  for (const init of initiatives) {
    if (init.objectiveId) {
      await prisma.alignmentRecord.create({
        data: {
          portfolioId: mainPortfolio.id,
          initiativeId: init.id,
          objectiveId: init.objectiveId,
          alignmentScore: init.status === 'APPROVED' ? 80.0 : 60.0,
          status: init.status === 'APPROVED' ? 'ALIGNED' : 'GAPPED',
          comments: init.status === 'APPROVED' 
            ? 'Fully mapped to objective. Awaiting complete baseline telemetry verification.'
            : 'Initiative is mapped to objective but state is in review.'
        }
      });
    }
  }
  console.log('  ✓ Seeded Alignment Records');

  console.log('🏁 Phase 13 Part 3: Product Portfolio Intelligence seeding completed successfully!');
}

seedPortfolioIntelligence()
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
