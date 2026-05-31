import { PrismaClient } from '../packages/db/src/generated/client';

const prisma = new PrismaClient();

async function testOutcomeEndpoints() {
  console.log('🤖 Running Integration Test for Phase 13 Part 2 Outcome Intelligence & Product KPI REST API...');

  const API_BASE = 'http://localhost:3001/api/outcomes';

  try {
    // 1. Resolve Project ID
    const project = await prisma.project.findFirst();
    if (!project) {
      throw new Error('No project found in database. Seed the database first.');
    }
    const projectId = project.id;
    console.log(`  ✓ Using Project ID: ${projectId} (${project.projectName})`);

    // 2. Resolve or Create Product Initiative
    let initiative = await prisma.productInitiative.findFirst({ where: { projectId } });
    if (!initiative) {
      initiative = await prisma.productInitiative.create({
        data: {
          projectId,
          title: 'Test Integration Initiative',
          description: 'Used to verify outcome evaluation endpoint behavior.',
          strategicScore: 75.0,
          userImpactScore: 80.0,
          survivabilityScore: 85.0,
          riskScore: 20.0,
          complexity: 'MEDIUM',
        }
      });
      console.log(`  ✓ Created test initiative: ${initiative.title}`);
    } else {
      console.log(`  ✓ Found existing initiative: ${initiative.title}`);
    }

    // 3. GET /api/outcomes/kpis
    console.log('  → Fetching product KPIs...');
    const kpiRes = await fetch(`${API_BASE}/kpis?projectId=${projectId}`);
    if (!kpiRes.ok) {
      throw new Error(`Failed to fetch KPIs, status: ${kpiRes.status}`);
    }
    const kpisData = await kpiRes.json();
    console.log(`  ✓ Found ${kpisData.kpis.length} KPIs.`);
    const activeKpi = kpisData.kpis[0];
    if (!activeKpi) {
      throw new Error('No active KPIs found. Please seed the database first.');
    }

    // 4. POST /api/outcomes/kpis
    console.log('  → Creating a new KPI definition...');
    const createKpiRes = await fetch(`${API_BASE}/kpis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        name: 'Automated Test Activation KPI',
        description: 'Verify system can write new target metrics',
        kpiType: 'ACTIVATION',
        metricKey: 'test_auto_activation',
        targetValue: 85.5,
        owner: 'System Harness'
      })
    });
    if (!createKpiRes.ok) {
      throw new Error(`Failed to create KPI, status: ${createKpiRes.status}`);
    }
    const newKpi = await createKpiRes.json();
    console.log('  ✓ KPI created successfully:', newKpi.name);

    // 5. GET /api/outcomes/health
    console.log('  → Fetching consolidated product/UX/strategic health ratings...');
    const healthRes = await fetch(`${API_BASE}/health?projectId=${projectId}`);
    if (!healthRes.ok) {
      throw new Error(`Failed to fetch health scores, status: ${healthRes.status}`);
    }
    const healthData = await healthRes.json();
    console.log('  ✓ Health summary averages:', healthData.averages);

    // 6. GET /api/outcomes/initiatives
    console.log('  → Querying initiative impact linkages...');
    const initiativeRes = await fetch(`${API_BASE}/initiatives?projectId=${projectId}`);
    if (!initiativeRes.ok) {
      throw new Error(`Failed to fetch initiatives, status: ${initiativeRes.status}`);
    }
    const initiativeData = await initiativeRes.json();
    console.log(`  ✓ Found ${initiativeData.impacts.length} initiative impact linkages.`);

    // 7. GET /api/outcomes/forecasts
    console.log('  → Querying KPI forecast trajectories...');
    const forecastRes = await fetch(`${API_BASE}/forecasts?projectId=${projectId}`);
    if (!forecastRes.ok) {
      throw new Error(`Failed to fetch forecasts, status: ${forecastRes.status}`);
    }
    const forecastData = await forecastRes.json();
    console.log(`  ✓ Found ${forecastData.forecasts.length} forecasts.`);

    // 8. POST /api/outcomes/forecasts
    console.log(`  → Creating KPI Forecast for KPI ID: ${activeKpi.id}...`);
    const createForecastRes = await fetch(`${API_BASE}/forecasts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        kpiId: activeKpi.id,
        projectedValue: 78.5,
        confidenceLower: 75.0,
        confidenceUpper: 82.0,
        targetQuarter: '2026-Q4'
      })
    });
    if (!createForecastRes.ok) {
      throw new Error(`Failed to create forecast, status: ${createForecastRes.status}`);
    }
    const newForecast = await createForecastRes.json();
    console.log('  ✓ Forecast created successfully for target quarter:', newForecast.targetQuarter);

    // 9. GET /api/outcomes/trends
    console.log('  → Querying KPI correlation trends...');
    const trendsRes = await fetch(`${API_BASE}/trends?projectId=${projectId}`);
    if (!trendsRes.ok) {
      throw new Error(`Failed to fetch correlation trends, status: ${trendsRes.status}`);
    }
    const trendsData = await trendsRes.json();
    console.log(`  ✓ Found ${trendsData.correlations.length} correlation coefficients.`);

    // 10. GET /api/outcomes/baselines
    console.log('  → Fetching pre-initiative KPI baselines...');
    const baselinesRes = await fetch(`${API_BASE}/baselines?projectId=${projectId}`);
    if (!baselinesRes.ok) {
      throw new Error(`Failed to fetch baselines, status: ${baselinesRes.status}`);
    }
    const baselinesData = await baselinesRes.json();
    console.log(`  ✓ Found ${baselinesData.baselines.length} baselines.`);

    // 11. POST /api/outcomes/baselines
    console.log(`  → Registering baseline value for KPI ID: ${activeKpi.id}...`);
    const createBaselineRes = await fetch(`${API_BASE}/baselines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        kpiId: activeKpi.id,
        value: activeKpi.currentValue * 0.9,
        windowStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        windowEnd: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      })
    });
    if (!createBaselineRes.ok) {
      throw new Error(`Failed to create baseline, status: ${createBaselineRes.status}`);
    }
    const newBaseline = await createBaselineRes.json();
    console.log('  ✓ Baseline registered successfully with value:', newBaseline.value);

    // 12. POST /api/outcomes/evaluate
    console.log('  → Triggering delta outcome assessment for initiative...');
    const evaluateRes = await fetch(`${API_BASE}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        initiativeId: initiative.id,
        title: 'Validation Verification Redesign Evaluation',
        description: 'Testing before-vs-after delta engine attributes',
        evidenceList: [
          { type: 'REPLAY', id: 'session-id-1234', desc: 'Mock replay demonstrating layout friction reduction' }
        ]
      })
    });
    if (!evaluateRes.ok) {
      throw new Error(`Failed to trigger evaluation, status: ${evaluateRes.status}`);
    }
    const evaluationResult = await evaluateRes.json();
    console.log('  ✓ Evaluation verdict computed:', evaluationResult.verdict);
    console.log('  ✓ Evaluated impacts length:', evaluationResult.impacts.length);

    console.log('\n🌟 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! The Outcome Intelligence endpoints are functional and verified.');

  } catch (err: any) {
    console.error('\n❌ INTEGRATION TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testOutcomeEndpoints();
