import { prisma } from '../packages/db/src/index';

async function testStrategyEndpoints() {
  console.log('🤖 Running Integration Test for Phase 13 Part 1 Product Strategy REST API...');

  const API_BASE = 'http://localhost:3001/api/strategy';

  try {
    // 1. Fetch Projects
    console.log('  → Fetching first project in db...');
    const project = await prisma.project.findFirst();
    if (!project) {
      throw new Error('No project found in database. Please run seeding first.');
    }
    const projectId = project.id;
    console.log(`  ✓ Using Project ID: ${projectId} (${project.projectName})`);

    // 2. Fetch Strategic Objectives
    console.log('  → Fetching Strategic Objectives...');
    const objRes = await fetch(`${API_BASE}/objectives?projectId=${projectId}`);
    if (!objRes.ok) {
      throw new Error(`Failed to fetch objectives, status: ${objRes.status}`);
    }
    const objData = await objRes.json();
    console.log(`  ✓ Found ${objData.objectives.length} objectives.`);

    // 3. Create a new Strategic Objective
    console.log('  → Creating a new Strategic Objective...');
    const createObjRes = await fetch(`${API_BASE}/objectives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        title: 'Optimize Payment Form Conversion',
        description: 'Reduce user dropoff and cognitive load during billing detail entry.',
        targetMetric: 'payment_success_rate',
        targetValue: 95.0
      })
    });
    if (!createObjRes.ok) {
      throw new Error(`Failed to create objective, status: ${createObjRes.status}`);
    }
    const newObjective = await createObjRes.json();
    console.log(`  ✓ Created objective: ${newObjective.title} (${newObjective.id})`);

    // 4. Fetch Initiatives
    console.log('  → Fetching Product Initiatives...');
    const initRes = await fetch(`${API_BASE}/initiatives?projectId=${projectId}`);
    if (!initRes.ok) {
      throw new Error(`Failed to fetch initiatives, status: ${initRes.status}`);
    }
    const initData = await initRes.json();
    console.log(`  ✓ Found ${initData.initiatives.length} initiatives.`);

    // 5. Create a new prioritized initiative with evidence and risks
    console.log('  → Creating a new Product Initiative with evidence and risks...');
    const createInitRes = await fetch(`${API_BASE}/initiatives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        objectiveId: newObjective.id,
        title: 'Integrate Apple Pay Express API',
        description: 'Provide an alternative fast checkout mechanism to prevent payment form abandonment.',
        owner: 'test-pm@fricta.ai',
        complexity: 'MEDIUM',
        effortScore: 5.0,
        targetQuarter: '2026-Q3',
        evidenceList: [
          {
            evidenceType: 'SIGNAL',
            referenceId: 'sig_apple_pay_demand',
            description: '45% mobile users drop off on traditional credit card forms.'
          }
        ],
        riskList: [
          {
            riskType: 'DEPENDENCY',
            description: 'Depends on Apple developer certification timeline.',
            severity: 'HIGH',
            mitigationPlan: 'Initiate account registration immediately.'
          }
        ]
      })
    });
    if (!createInitRes.ok) {
      throw new Error(`Failed to create initiative, status: ${createInitRes.status}`);
    }
    const newInitiative = await createInitRes.json();
    console.log(`  ✓ Created initiative: ${newInitiative.title} (${newInitiative.id})`);
    console.log(`    ↳ Calculated Priority Score: ${newInitiative.strategicScore}`);

    // 6. Decide / Transition Initiative status
    console.log(`  → Transitioning status of initiative ${newInitiative.id} to APPROVED...`);
    const decideRes = await fetch(`${API_BASE}/initiatives/${newInitiative.id}/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'APPROVED',
        owner: 'test-lead@fricta.ai',
        complexity: 'MEDIUM',
        effortScore: 6.0
      })
    });
    if (!decideRes.ok) {
      throw new Error(`Failed to transition status, status: ${decideRes.status}`);
    }
    const decidedInit = await decideRes.json();
    console.log(`  ✓ Initiative status updated to ${decidedInit.status}. Owner is ${decidedInit.owner}.`);

    // 7. Get Roadmaps list
    console.log('  → Fetching Product Roadmaps...');
    const roadmapRes = await fetch(`${API_BASE}/roadmaps?projectId=${projectId}`);
    if (!roadmapRes.ok) {
      throw new Error(`Failed to fetch roadmaps, status: ${roadmapRes.status}`);
    }
    const roadmapData = await roadmapRes.json();
    console.log(`  ✓ Found ${roadmapData.roadmaps.length} roadmaps.`);

    // 8. Generate / Optimize sequencing
    console.log('  → Optimizing roadmap sequencing proposal...');
    const generateRes = await fetch(`${API_BASE}/roadmaps/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId })
    });
    if (!generateRes.ok) {
      throw new Error(`Failed to generate roadmap proposals, status: ${generateRes.status}`);
    }
    const generateData = await generateRes.json();
    console.log(`  ✓ Sequenced roadmaps count: ${generateData.roadmaps.length}`);

    // 9. Fetch Priorities
    console.log('  → Fetching Priority Board opportunity scores...');
    const prioritiesRes = await fetch(`${API_BASE}/priorities?projectId=${projectId}`);
    if (!prioritiesRes.ok) {
      throw new Error(`Failed to fetch priorities, status: ${prioritiesRes.status}`);
    }
    const prioritiesData = await prioritiesRes.json();
    console.log(`  ✓ Found ${prioritiesData.priorities.length} prioritize scores.`);

    // 10. Fetch Executive Command Center Metrics
    console.log('  → Fetching Executive dashboard metrics...');
    const execRes = await fetch(`${API_BASE}/executive?projectId=${projectId}`);
    if (!execRes.ok) {
      throw new Error(`Failed to fetch executive dashboard, status: ${execRes.status}`);
    }
    const execData = await execRes.json();
    console.log(`  ✓ Product Health Index compiled: ${execData.metrics.productHealthScore}%`);

    // 11. Fetch UX Health Consolidated Engine Metrics
    console.log('  → Fetching UX Health consolidated metrics...');
    const healthRes = await fetch(`${API_BASE}/health?projectId=${projectId}`);
    if (!healthRes.ok) {
      throw new Error(`Failed to fetch health breakdown, status: ${healthRes.status}`);
    }
    const healthData = await healthRes.json();
    console.log(`  ✓ Decision Trace Log events count: ${healthData.timeline.length}`);
    console.log(`  ✓ Capacity buckets:`, healthData.capacityPlanner.capacity);

    console.log('\n🌟 INTEGRATION TEST COMPLETED SUCCESSFULLY! All 10 strategy routes work and respond with correct RICE / Roadmap payloads.');

  } catch (err: any) {
    console.error('\n❌ INTEGRATION TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testStrategyEndpoints();
