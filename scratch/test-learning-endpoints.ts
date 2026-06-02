import { prisma } from '../packages/db/src/index';

async function testLearningEndpoints() {
  console.log('🧠 Running Integration Test for Phase 14 Part 2 Organizational Learning Engine REST API...');

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

    // 2. POST /api/learning/scan
    console.log('  → Triggering Learning Engine scan...');
    const scanRes = await fetch(`${API_BASE}/learning/scan`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ projectId })
    });
    if (!scanRes.ok) {
      throw new Error(`Failed to scan, status: ${scanRes.status}`);
    }
    const scanData = await scanRes.json();
    console.log(`  ✓ Scan completed. Success: ${scanData.success}. Snapshot ID: ${scanData.snapshotId}`);

    // 3. GET /api/learning/patterns
    console.log('  → Fetching detected learning patterns...');
    const patternsRes = await fetch(`${API_BASE}/learning/patterns?projectId=${projectId}`, { headers });
    if (!patternsRes.ok) {
      throw new Error(`Failed to fetch patterns, status: ${patternsRes.status}`);
    }
    const patternsData = await patternsRes.json();
    console.log(`  ✓ Patterns count: ${patternsData.patterns.length}`);

    // 4. GET /api/learning/success
    console.log('  → Fetching success wins library...');
    const successRes = await fetch(`${API_BASE}/learning/success?projectId=${projectId}`, { headers });
    if (!successRes.ok) {
      throw new Error(`Failed to fetch success patterns, status: ${successRes.status}`);
    }
    const successData = await successRes.json();
    console.log(`  ✓ Success wins cataloged: ${successData.successes.length}`);

    // 5. GET /api/learning/failures
    console.log('  → Fetching failures catalog...');
    const failuresRes = await fetch(`${API_BASE}/learning/failures?projectId=${projectId}`, { headers });
    if (!failuresRes.ok) {
      throw new Error(`Failed to fetch failures, status: ${failuresRes.status}`);
    }
    const failuresData = await failuresRes.json();
    console.log(`  ✓ Failure patterns cataloged: ${failuresData.failures.length}`);

    // 6. GET /api/learning/history
    console.log('  → Querying historical cases and outcome summary...');
    const historyRes = await fetch(`${API_BASE}/learning/history?projectId=${projectId}&title=onboarding`, { headers });
    if (!historyRes.ok) {
      throw new Error(`Failed to fetch history cases, status: ${historyRes.status}`);
    }
    const historyData = await historyRes.json();
    console.log(`  ✓ Similar matches found: ${historyData.matches.length}`);
    console.log(`  ✓ Released lessons count: ${historyData.lessons.length}`);
    console.log(`  ✓ Average success/roi rate computed: ${historyData.outcomes?.successRate ? (historyData.outcomes.successRate * 100).toFixed(0) : '0'}%`);

    // 7. GET /api/learning/personas
    console.log('  → Querying persona habits & timeline...');
    const personasRes = await fetch(`${API_BASE}/learning/personas?projectId=${projectId}`, { headers });
    if (!personasRes.ok) {
      throw new Error(`Failed to fetch persona habits, status: ${personasRes.status}`);
    }
    const personasData = await personasRes.json();
    console.log(`  ✓ Personas behaviors tracked: ${personasData.personas.length}`);
    console.log(`  ✓ Learning Timeline release events: ${personasData.timeline.length}`);

    // 8. GET /api/learning/evidence/:id
    if (patternsData.patterns.length > 0) {
      const patId = patternsData.patterns[0].id;
      console.log(`  → Querying trace evidence for pattern: ${patId}...`);
      const evidenceRes = await fetch(`${API_BASE}/learning/evidence/${patId}?projectId=${projectId}`, { headers });
      if (!evidenceRes.ok) {
        throw new Error(`Failed to fetch evidence, status: ${evidenceRes.status}`);
      }
      const evidenceData = await evidenceRes.json();
      console.log(`  ✓ Evidence resolved: ${evidenceData.evidence.length} trace items.`);
      for (const ev of evidenceData.evidence) {
        console.log(`    - Link type: [${ev.evidenceType}]. Detail: ${ev.description}`);
      }
    }

    console.log('🏁 Integration Test for Organizational Learning Engine completed successfully! ✅');

  } catch (err: any) {
    console.error('❌ Integration Test failed:', err.message);
    process.exit(1);
  }
}

testLearningEndpoints()
  .catch((err) => {
    console.error('❌ Test script exception:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
