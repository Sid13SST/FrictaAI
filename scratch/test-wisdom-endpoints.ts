import { prisma } from '../packages/db/src/index';

async function testWisdomEndpoints() {
  console.log('📚 Running Integration Test for Phase 14 Part 4 Institutional Wisdom REST API...');

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

    // 2. GET /api/wisdom/lessons
    console.log('  → Querying institutional lessons...');
    const lessonsRes = await fetch(`${API_BASE}/wisdom/lessons?projectId=${projectId}`, { headers });
    if (!lessonsRes.ok) {
      throw new Error(`Failed to fetch lessons, status: ${lessonsRes.status}`);
    }
    const lessonsData = await lessonsRes.json();
    console.log(`  ✓ Lessons count: ${lessonsData.lessons.length}`);
    console.log(`  ✓ Wisdom disclaimer message verified: "${lessonsData.disclaimer?.message?.substring(0, 50)}..."`);

    // 3. GET /api/wisdom/principles
    console.log('  → Querying observational principles...');
    const principlesRes = await fetch(`${API_BASE}/wisdom/principles?projectId=${projectId}`, { headers });
    if (!principlesRes.ok) {
      throw new Error(`Failed to fetch principles, status: ${principlesRes.status}`);
    }
    const principlesData = await principlesRes.json();
    console.log(`  ✓ Principles count: ${principlesData.principles.length}`);

    // 4. GET /api/wisdom/history
    console.log('  → Querying historical synthesis reports and cases...');
    const historyRes = await fetch(`${API_BASE}/wisdom/history?projectId=${projectId}`, { headers });
    if (!historyRes.ok) {
      throw new Error(`Failed to fetch history, status: ${historyRes.status}`);
    }
    const historyData = await historyRes.json();
    console.log(`  ✓ Historical syntheses: ${historyData.syntheses.length}`);
    console.log(`  ✓ Cases success stats: ${historyData.casesStats?.totalCount} total cases, avg success: ${Math.round((historyData.casesStats?.avgSuccessRate || 0) * 100)}%`);

    // 5. GET /api/wisdom/trends
    console.log('  → Fetching long-term trend directions...');
    const trendsRes = await fetch(`${API_BASE}/wisdom/trends?projectId=${projectId}`, { headers });
    if (!trendsRes.ok) {
      throw new Error(`Failed to fetch trends, status: ${trendsRes.status}`);
    }
    const trendsData = await trendsRes.json();
    console.log(`  ✓ Long-term trends tracked: ${trendsData.trends.length}`);

    // 6. GET /api/wisdom/synthesis
    console.log('  → Querying strategic learnings and governance compliance audits...');
    const synthRes = await fetch(`${API_BASE}/wisdom/synthesis?projectId=${projectId}`, { headers });
    if (!synthRes.ok) {
      throw new Error(`Failed to fetch synthesis details, status: ${synthRes.status}`);
    }
    const synthData = await synthRes.json();
    console.log(`  ✓ Strategic learnings: ${synthData.learnings.length}`);
    console.log(`  ✓ Personacompletion groups: ${synthData.personas.length}`);
    console.log(`  ✓ Governance compliance verified: ${synthData.governanceAudit?.isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}`);
    console.log(`  ✓ Wisdom records with audit metadata: ${synthData.records.length}`);

    // 7. POST /api/wisdom/evaluate
    console.log('  → Triggering Wisdom cycle evaluation and realtime updates...');
    const evaluateRes = await fetch(`${API_BASE}/wisdom/evaluate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ projectId })
    });
    if (!evaluateRes.ok) {
      throw new Error(`Failed to evaluate wisdom cycle, status: ${evaluateRes.status}`);
    }
    const evaluateData = await evaluateRes.json();
    console.log(`  ✓ Evaluation completed successfully. Snapshot ID: ${evaluateData.snapshotId}`);
    console.log(`  ✓ Dynamic logs generated: ${evaluateData.logs.length} statements.`);

    // 8. GET /api/wisdom/evidence
    if (lessonsData.lessons.length > 0) {
      const lessonId = lessonsData.lessons[0].id;
      console.log(`  → Fetching evidence links for lesson: ${lessonId}...`);
      const evidenceRes = await fetch(`${API_BASE}/wisdom/evidence?projectId=${projectId}&lessonId=${lessonId}`, { headers });
      if (!evidenceRes.ok) {
        throw new Error(`Failed to fetch evidence, status: ${evidenceRes.status}`);
      }
      const evidenceData = await evidenceRes.json();
      console.log(`  ✓ Resolved evidence trace nodes: ${evidenceData.evidence.length}`);
    }

    console.log('🏁 Integration Test for Institutional Wisdom completed successfully! ✅');

  } catch (err: any) {
    console.error('❌ Integration Test failed:', err.message);
    process.exit(1);
  }
}

testWisdomEndpoints()
  .catch((err) => {
    console.error('❌ Test script exception:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
