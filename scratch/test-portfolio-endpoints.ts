import { prisma } from '../packages/db/src/index';

async function testPortfolioEndpoints() {
  console.log('💼 Running Integration Test for Phase 13 Part 3 Portfolio Intelligence REST API...');

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

    // 3. GET /api/portfolio/executive
    console.log('  → Fetching executive investment allocations...');
    const execRes = await fetch(`${API_BASE}/portfolio/executive?projectId=${projectId}`, { headers });
    if (!execRes.ok) {
      throw new Error(`Failed to fetch executive allocations, status: ${execRes.status}`);
    }
    const execData = await execRes.json();
    console.log(`  ✓ Executive Allocations count: ${execData.allocations.length}`);
    const portfolioId = execData.allocations[0]?.portfolioId;

    if (!portfolioId) {
      console.warn('  ⚠️ No portfolio ID found in allocations. Skipping dependent tests.');
    } else {
      // 4. POST /api/portfolio/alignment/evaluate
      console.log(`  → Triggering alignment evaluation for portfolio ${portfolioId}...`);
      const evalRes = await fetch(`${API_BASE}/portfolio/alignment/evaluate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ projectId, portfolioId })
      });
      if (!evalRes.ok) {
        throw new Error(`Failed to trigger alignment evaluation, status: ${evalRes.status}`);
      }
      const evalData = await evalRes.json();
      console.log(`  ✓ Alignment results computed: ${evalData.alignments.length} records`);

      // 5. GET /api/portfolio/alignment
      console.log('  → Querying alignment records...');
      const alignRes = await fetch(`${API_BASE}/portfolio/alignment?projectId=${projectId}`, { headers });
      if (!alignRes.ok) {
        throw new Error(`Failed to fetch alignment, status: ${alignRes.status}`);
      }
      const alignData = await alignRes.json();
      console.log(`  ✓ Mapped alignment records count: ${alignData.alignments.length}`);
    }

    // 6. GET /api/portfolio/health
    console.log('  → Querying portfolio health indices...');
    const healthRes = await fetch(`${API_BASE}/portfolio/health?projectId=${projectId}`, { headers });
    if (!healthRes.ok) {
      throw new Error(`Failed to fetch health, status: ${healthRes.status}`);
    }
    const healthData = await healthRes.json();
    console.log('  ✓ Health ratings:', healthData.averages);

    // 7. GET /api/portfolio/objectives
    console.log('  → Querying mapped objectives...');
    const objRes = await fetch(`${API_BASE}/portfolio/objectives?projectId=${projectId}`, { headers });
    if (!objRes.ok) {
      throw new Error(`Failed to fetch objectives, status: ${objRes.status}`);
    }
    const objData = await objRes.json();
    console.log(`  ✓ Portfolio objective mappings: ${objData.mappings.length}`);

    // 8. GET /api/portfolio/dependencies
    console.log('  → Querying roadmap dependencies...');
    const depRes = await fetch(`${API_BASE}/portfolio/dependencies?projectId=${projectId}`, { headers });
    if (!depRes.ok) {
      throw new Error(`Failed to fetch dependencies, status: ${depRes.status}`);
    }
    const depData = await depRes.json();
    console.log(`  ✓ Active dependencies: ${depData.dependencies.length}`);

    // 9. GET /api/portfolio/risks
    console.log('  → Querying strategic gaps and risks...');
    const risksRes = await fetch(`${API_BASE}/portfolio/risks?projectId=${projectId}`, { headers });
    if (!risksRes.ok) {
      throw new Error(`Failed to fetch risks, status: ${risksRes.status}`);
    }
    const risksData = await risksRes.json();
    console.log(`  ✓ Strategic Gaps count: ${risksData.gaps.length}`);
    console.log(`  ✓ Organizational Risks count: ${risksData.risks.length}`);

    console.log('\n🌟 INTEGRATION TEST COMPLETED SUCCESSFULLY! All endpoints respond correctly under Hono routing.');

  } catch (err: any) {
    console.error('\n❌ INTEGRATION TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testPortfolioEndpoints();
