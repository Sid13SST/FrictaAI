import { prisma } from '../packages/db/src/index';

async function testForecastingEndpoints() {
  console.log('📈 Running Integration Test for Phase 14 Part 3 Organizational Forecasting REST API...');

  const API_BASE = 'http://127.0.0.1:3001/api';

  try {
    // Fetch User to bypass RBAC if needed
    const user = await prisma.user.findFirst();
    const headers = {
      'Content-Type': 'application/json',
      'X-User-Id': user?.id || 'demo_user'
    };

    // 1. Fetch Projects
    console.log('  → Fetching projects list...');
    const projectRes = await fetch(`${API_BASE}/projects`, { headers });
    if (!projectRes.ok) {
      throw new Error(`Failed to fetch projects, status: ${projectRes.status}`);
    }
    const projects = await projectRes.json();
    const project = projects[0] || (projects.projects ? projects.projects[0] : null);
    if (!project) {
      throw new Error('No project found in database. Seed the database first.');
    }
    const projectId = project.id;
    console.log(`  ✓ Using Project ID: ${projectId} (${project.projectName})`);

    // 2. GET /api/forecasts
    console.log('  → Querying probabilistic forecasts...');
    const forecastsRes = await fetch(`${API_BASE}/forecasts?projectId=${projectId}`, { headers });
    if (!forecastsRes.ok) {
      throw new Error(`Failed to fetch forecasts, status: ${forecastsRes.status}`);
    }
    const forecastsData = await forecastsRes.json();
    console.log(`  ✓ Forecasts count: ${forecastsData.forecasts.length}`);
    console.log(`  ✓ Disclaimer message verified: "${forecastsData.disclaimer?.message?.substring(0, 50)}..."`);

    // 3. GET /api/forecasts/scenarios
    console.log('  → Querying what-if scenarios...');
    const scenariosRes = await fetch(`${API_BASE}/forecasts/scenarios?projectId=${projectId}`, { headers });
    if (!scenariosRes.ok) {
      throw new Error(`Failed to fetch scenarios, status: ${scenariosRes.status}`);
    }
    const scenariosData = await scenariosRes.json();
    console.log(`  ✓ Scenarios count: ${scenariosData.scenarios.length}`);

    // 4. GET /api/forecasts/risks
    console.log('  → Fetching emerging risk signals...');
    const risksRes = await fetch(`${API_BASE}/forecasts/risks?projectId=${projectId}`, { headers });
    if (!risksRes.ok) {
      throw new Error(`Failed to fetch emerging risks, status: ${risksRes.status}`);
    }
    const risksData = await risksRes.json();
    console.log(`  ✓ Emerging risks detected: ${risksData.risks.length}`);

    // 5. GET /api/forecasts/assumptions
    console.log('  → Fetching assumptions log...');
    const assumptionsRes = await fetch(`${API_BASE}/forecasts/assumptions?projectId=${projectId}`, { headers });
    if (!assumptionsRes.ok) {
      throw new Error(`Failed to fetch assumptions, status: ${assumptionsRes.status}`);
    }
    const assumptionsData = await assumptionsRes.json();
    console.log(`  ✓ Active assumptions: ${assumptionsData.assumptions.length}`);

    // 6. POST /api/forecasts/evaluate
    console.log('  → Triggering Forecasting cycle evaluation...');
    const evaluateRes = await fetch(`${API_BASE}/forecasts/evaluate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ projectId })
    });
    if (!evaluateRes.ok) {
      throw new Error(`Failed to evaluate forecasting, status: ${evaluateRes.status}`);
    }
    const evaluateData = await evaluateRes.json();
    console.log(`  ✓ Evaluation completed successfully. Snapshot ID: ${evaluateData.snapshotId}`);
    console.log(`  ✓ Project timelines projected: ${evaluateData.timeline.length} milestone events.`);

    // 7. GET /api/forecasts/evidence
    if (forecastsData.forecasts.length > 0) {
      const forecastId = forecastsData.forecasts[0].id;
      console.log(`  → Fetching evidence links for forecast: ${forecastId}...`);
      const evidenceRes = await fetch(`${API_BASE}/forecasts/evidence?projectId=${projectId}&forecastId=${forecastId}`, { headers });
      if (!evidenceRes.ok) {
        throw new Error(`Failed to fetch evidence, status: ${evidenceRes.status}`);
      }
      const evidenceData = await evidenceRes.json();
      console.log(`  ✓ Resolved evidence links: ${evidenceData.evidence.length}`);
    }

    console.log('🏁 Integration Test for Forecasting & Scenario Intelligence completed successfully! ✅');

  } catch (err: any) {
    console.error('❌ Integration Test failed:', err.message);
    process.exit(1);
  }
}

testForecastingEndpoints()
  .catch((err) => {
    console.error('❌ Test script exception:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
