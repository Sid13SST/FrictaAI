import { prisma } from '../packages/db/src/index';

async function testExecutiveEndpoints() {
  console.log('💼 Running Integration Test for Phase 13 Part 4 Executive Decision Support REST API...');

  const API_BASE = 'http://127.0.0.1:3001/api';

  try {
    // 1. Fetch Projects
    console.log('  → Fetching projects list...');
    const projectRes = await fetch(`${API_BASE}/projects`);
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

    // 2. Fetch User to bypass RBAC if needed
    const user = await prisma.user.findFirst();
    const headers = {
      'Content-Type': 'application/json',
      'X-User-Id': user?.id || 'demo_user'
    };

    // 3. GET /api/executive/health
    console.log('  → Querying health briefings & metrics trends...');
    const healthRes = await fetch(`${API_BASE}/executive/health?projectId=${projectId}`, { headers });
    if (!healthRes.ok) {
      throw new Error(`Failed to fetch health briefing, status: ${healthRes.status}`);
    }
    const healthData = await healthRes.json();
    console.log('  ✓ Health indicators summary:', healthData.briefing);

    // 4. GET /api/executive/recommendations
    console.log('  → Fetching active strategic recommendations...');
    const recRes = await fetch(`${API_BASE}/executive/recommendations?projectId=${projectId}`, { headers });
    if (!recRes.ok) {
      throw new Error(`Failed to fetch recommendations, status: ${recRes.status}`);
    }
    const recData = await recRes.json();
    console.log(`  ✓ Recommendations count: ${recData.recommendations.length}`);

    // If an active recommendation exists, test decision and evidence endpoints
    const activeRec = recData.recommendations.find((r: any) => r.status === 'ACTIVE');
    if (!activeRec) {
      console.warn('  ⚠️ No active recommendation found to test decision triggers.');
    } else {
      // 5. GET /api/executive/evidence/:id
      console.log(`  → Resolving evidence trail for recommendation ${activeRec.id}...`);
      const evRes = await fetch(`${API_BASE}/executive/evidence/${activeRec.id}?projectId=${projectId}`, { headers });
      if (!evRes.ok) {
        throw new Error(`Failed to fetch evidence, status: ${evRes.status}`);
      }
      const evData = await evRes.json();
      console.log(`  ✓ Resolved evidence trail count: ${evData.evidence.length}`);

      // 6. POST /api/executive/recommendations/:id/decide
      console.log(`  → Authorizing decision override APPROVE on recommendation ${activeRec.id}...`);
      const decideRes = await fetch(`${API_BASE}/executive/recommendations/${activeRec.id}/decide`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          projectId,
          action: 'APPROVE',
          notes: 'Test decision override: checked and approved.'
        })
      });
      if (!decideRes.ok) {
        throw new Error(`Failed to record decision, status: ${decideRes.status}`);
      }
      const decideData = await decideRes.json();
      console.log('  ✓ Decision logged successfully:', decideData.decision);
    }

    // 7. GET /api/executive/governance
    console.log('  → Running policy compliance & reviews checks...');
    const govRes = await fetch(`${API_BASE}/executive/governance?projectId=${projectId}`, { headers });
    if (!govRes.ok) {
      throw new Error(`Failed to fetch governance reviews, status: ${govRes.status}`);
    }
    const govData = await govRes.json();
    console.log(`  ✓ Mapped policy compliance checks: ${govData.policyReviews.length}`);
    console.log(`  ✓ Initiative compliance audits: ${govData.initiativeReviews.length}`);

    // 8. GET /api/executive/risks
    console.log('  → Fetching strategic risk assessments...');
    const risksRes = await fetch(`${API_BASE}/executive/risks?projectId=${projectId}`, { headers });
    if (!risksRes.ok) {
      throw new Error(`Failed to fetch strategic risks, status: ${risksRes.status}`);
    }
    const risksData = await risksRes.json();
    console.log(`  ✓ Active risk count: ${risksData.risks.length}`);

    // 9. GET /api/executive/decisions
    console.log('  → Querying auditable decision timeline events...');
    const decRes = await fetch(`${API_BASE}/executive/decisions?projectId=${projectId}`, { headers });
    if (!decRes.ok) {
      throw new Error(`Failed to fetch decisions history, status: ${decRes.status}`);
    }
    const decData = await decRes.json();
    console.log(`  ✓ Timeline audit events count: ${decData.timeline.length}`);
    console.log(`  ✓ Monitored decision outcomes: ${decData.outcomes.length}`);

    console.log('\n🌟 INTEGRATION TEST COMPLETED SUCCESSFULLY! All executive endpoints respond correctly under Hono routing.');

  } catch (err: any) {
    console.error('\n❌ INTEGRATION TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testExecutiveEndpoints();
