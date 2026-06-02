import { prisma } from '../packages/db/src/index';

async function testKnowledgeEndpoints() {
  console.log('🕸️ Running Integration Test for Phase 14 Part 1 Organizational Knowledge Graph REST API...');

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

    // 3. POST /api/knowledge/sync
    console.log('  → Triggering Knowledge Graph synchronization...');
    const syncRes = await fetch(`${API_BASE}/knowledge/sync`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ projectId })
    });
    if (!syncRes.ok) {
      throw new Error(`Failed to sync knowledge graph, status: ${syncRes.status}`);
    }
    const syncData = await syncRes.json();
    console.log(`  ✓ Synchronization completed. Logs: ${syncData.logs.length} items.`);

    // 4. GET /api/knowledge/entities
    console.log('  → Querying knowledge entities...');
    const entitiesRes = await fetch(`${API_BASE}/knowledge/entities?projectId=${projectId}`, { headers });
    if (!entitiesRes.ok) {
      throw new Error(`Failed to fetch entities, status: ${entitiesRes.status}`);
    }
    const entitiesData = await entitiesRes.json();
    console.log(`  ✓ Entities count: ${entitiesData.entities.length}`);

    // 5. GET /api/knowledge/relationships
    console.log('  → Querying knowledge relationships...');
    const relRes = await fetch(`${API_BASE}/knowledge/relationships?projectId=${projectId}`, { headers });
    if (!relRes.ok) {
      throw new Error(`Failed to fetch relationships, status: ${relRes.status}`);
    }
    const relData = await relRes.json();
    console.log(`  ✓ Relationships count: ${relData.relationships.length}`);

    // 6. GET /api/knowledge/discovery
    console.log('  → Running discovery scanner...');
    const discRes = await fetch(`${API_BASE}/knowledge/discovery?projectId=${projectId}`, { headers });
    if (!discRes.ok) {
      throw new Error(`Failed to run discovery scanner, status: ${discRes.status}`);
    }
    const discData = await discRes.json();
    console.log(`  ✓ Discovered items: ${discData.discoveries.length}`);

    // 7. GET /api/knowledge/search
    console.log('  → Executing semantic search for "kpi"...');
    const searchRes = await fetch(`${API_BASE}/knowledge/search?projectId=${projectId}&q=kpi`, { headers });
    if (!searchRes.ok) {
      throw new Error(`Failed to perform search, status: ${searchRes.status}`);
    }
    const searchData = await searchRes.json();
    console.log(`  ✓ Search results: ${searchData.results.length} items`);

    // 8. GET /api/knowledge/timeline
    console.log('  → Fetching audit timeline logs...');
    const timelineRes = await fetch(`${API_BASE}/knowledge/timeline?projectId=${projectId}`, { headers });
    if (!timelineRes.ok) {
      throw new Error(`Failed to fetch timeline, status: ${timelineRes.status}`);
    }
    const timelineData = await timelineRes.json();
    console.log(`  ✓ Timeline events: ${timelineData.timeline.length}`);

    // 9. GET /api/knowledge/health
    console.log('  → Fetching graph health and density scores...');
    const healthRes = await fetch(`${API_BASE}/knowledge/health?projectId=${projectId}`, { headers });
    if (!healthRes.ok) {
      throw new Error(`Failed to fetch health, status: ${healthRes.status}`);
    }
    const healthData = await healthRes.json();
    console.log(`  ✓ Health records logged: ${healthData.healthRecords.length}`);
    console.log(`  ✓ Strategic alignment status: ${healthData.alignment.status} (${healthData.alignment.alignmentRate.toFixed(0)}%)`);

    // 10. GET /api/knowledge/evidence/:id
    if (relData.relationships.length > 0) {
      const relId = relData.relationships[0].id;
      console.log(`  → Querying evidence trail for relationship: ${relId}...`);
      const evRes = await fetch(`${API_BASE}/knowledge/evidence/${relId}?projectId=${projectId}`, { headers });
      if (!evRes.ok) {
        throw new Error(`Failed to fetch evidence, status: ${evRes.status}`);
      }
      const evData = await evRes.json();
      console.log(`  ✓ Evidence linked nodes count: ${evData.evidence.length}`);
    } else {
      console.log('  ⚠️ Skipping evidence trail test: No relationships found.');
    }

    console.log('\n🌟 INTEGRATION TEST COMPLETED SUCCESSFULLY! All Knowledge Graph endpoints respond correctly under Hono routing.');

  } catch (err: any) {
    console.error('\n❌ INTEGRATION TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testKnowledgeEndpoints();
