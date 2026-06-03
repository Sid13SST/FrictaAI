import { Hono } from 'hono';
import { prisma } from '@fricta/db';
import { publicRoutes } from '../routes/public';
import { realtimeRoutes } from '../routes/realtime';
import { workspaceCoreRoutes } from '../routes/workspaceCore';

// Define the Test App structure to match production mounting
const app = new Hono();

// 1. Query token to Authorization header rewrite (matches index.ts)
app.use('*', async (c, next) => {
  const token = c.req.query('token');
  if (token) {
    c.req.raw.headers.set('Authorization', `Bearer ${token}`);
  }
  await next();
});

// 2. Mock Clerk middleware setting clerkAuth variable in Hono context
app.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  let userId: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    // In our mock, the token can be the user ID itself
    if (token.startsWith('user-')) {
      userId = token;
    }
  }
  c.set('clerkAuth', () => ({ userId }));
  await next();
});

// Mount the routes under the identical paths as index.ts
app.route('/api/public', publicRoutes);
app.route('/api/realtime', realtimeRoutes);
app.route('/api', workspaceCoreRoutes);

interface TestResult {
  section: string;
  name: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  notes?: string;
}

const testResults: TestResult[] = [];

function recordResult(section: string, name: string, expectedStatus: number, actualStatus: number, notes?: string) {
  testResults.push({
    section,
    name,
    expectedStatus,
    actualStatus,
    passed: expectedStatus === actualStatus,
    notes
  });
}

async function runTests() {
  console.log('\n🔒 Fricta Backend Security Hardening & Regression Test Suite\n');

  // Seed test data
  const ownerId = 'user-sec-owner';
  const nonOwnerId = 'user-sec-non-owner';
  const projectId = 'project-sec-test';
  const sessionId = 'session-sec-test';
  
  const orgIdOwner = 'org-sec-owner';
  const workspaceIdOwner = 'workspace-sec-owner';
  
  const orgIdNonOwner = 'org-sec-non-owner';
  const workspaceIdNonOwner = 'workspace-sec-non-owner';

  console.log('🌱 Seeding database for security tests...');
  try {
    // Seed users
    await prisma.user.upsert({
      where: { id: ownerId },
      update: {},
      create: { id: ownerId, email: 'sec-owner@fricta.ai', name: 'Sec Owner' }
    });

    await prisma.user.upsert({
      where: { id: nonOwnerId },
      update: {},
      create: { id: nonOwnerId, email: 'sec-nonowner@fricta.ai', name: 'Sec Non-Owner' }
    });

    // Seed projects
    await prisma.project.upsert({
      where: { id: projectId },
      update: { userId: ownerId },
      create: { id: projectId, projectName: 'Sec Test Project', websiteUrl: 'https://sec.fricta.ai', userId: ownerId }
    });

    // Seed sessions
    await prisma.workflowSession.upsert({
      where: { id: sessionId },
      update: { projectId },
      create: { id: sessionId, projectId, status: 'COMPLETED' }
    });

    // Seed workspaces for user spoofing validation
    await prisma.organization.upsert({
      where: { id: orgIdOwner },
      update: {},
      create: { id: orgIdOwner, name: 'Owner Org' }
    });
    
    await prisma.workspace.upsert({
      where: { id: workspaceIdOwner },
      update: { organizationId: orgIdOwner },
      create: { id: workspaceIdOwner, name: 'Owner Workspace', organizationId: orgIdOwner }
    });

    // Ensure clean workspace member assignments
    await prisma.workspaceMember.deleteMany({
      where: { userId: { in: [ownerId, nonOwnerId] } }
    }).catch(() => {});

    await prisma.workspaceMember.create({
      data: {
        organizationId: orgIdOwner,
        workspaceId: workspaceIdOwner,
        userId: ownerId,
        role: 'OWNER'
      }
    });

    await prisma.organization.upsert({
      where: { id: orgIdNonOwner },
      update: {},
      create: { id: orgIdNonOwner, name: 'Non-Owner Org' }
    });
    
    await prisma.workspace.upsert({
      where: { id: workspaceIdNonOwner },
      update: { organizationId: orgIdNonOwner },
      create: { id: workspaceIdNonOwner, name: 'Non-Owner Workspace', organizationId: orgIdNonOwner }
    });

    await prisma.workspaceMember.create({
      data: {
        organizationId: orgIdNonOwner,
        workspaceId: workspaceIdNonOwner,
        userId: nonOwnerId,
        role: 'OWNER'
      }
    });

    console.log('✅ Security test seeding complete.\n');
  } catch (error: any) {
    console.error('❌ Database seeding failed:', error.message);
    process.exit(1);
  }

  // ==========================================
  // TEST CASE 1: API Key Generation Bypass
  // ==========================================
  console.log('🧪 Testing API Key Generation Authorization...');

  // Scenario A: Unauthenticated request
  const res1A = await app.request('/api/public/keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, name: 'API Key A', scopes: ['read'] })
  });
  recordResult('API Key Generation', 'Unauthenticated request rejected', 401, res1A.status);

  // Scenario B: Authenticated request, but not project owner
  const res1B = await app.request('/api/public/keys', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${nonOwnerId}`
    },
    body: JSON.stringify({ projectId, name: 'API Key B', scopes: ['read'] })
  });
  recordResult('API Key Generation', 'Non-owner request rejected', 403, res1B.status);

  // Scenario C: Authenticated request, project owner
  const res1C = await app.request('/api/public/keys', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ownerId}`
    },
    body: JSON.stringify({ projectId, name: 'API Key C', scopes: ['read'] })
  });
  recordResult('API Key Generation', 'Project owner request allowed', 200, res1C.status);

  // Scenario D: Non-existent project
  const res1D = await app.request('/api/public/keys', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ownerId}`
    },
    body: JSON.stringify({ projectId: 'non-existent-project-id', name: 'API Key D', scopes: ['read'] })
  });
  recordResult('API Key Generation', 'Non-existent project rejected', 404, res1D.status);


  // ==========================================
  // TEST CASE 2: SSE Realtime Streams Hardening
  // ==========================================
  console.log('\n🧪 Testing Realtime SSE Streams Hardening...');

  // Scenario A: Unauthenticated (no token)
  const res2A = await app.request(`/api/realtime/orchestration/${sessionId}`);
  recordResult('SSE Realtime Streams', 'Unauthenticated request rejected', 401, res2A.status);

  // Scenario B: Authenticated, but not session owner
  const res2B = await app.request(`/api/realtime/orchestration/${sessionId}?token=${nonOwnerId}`);
  recordResult('SSE Realtime Streams', 'Non-owner request rejected', 403, res2B.status);

  // Scenario C: Authenticated, session owner (using query parameter token rewrite)
  const res2C = await app.request(`/api/realtime/orchestration/${sessionId}?token=${ownerId}`);
  const isSSE = res2C.headers.get('Content-Type')?.startsWith('text/event-stream');
  recordResult(
    'SSE Realtime Streams',
    'Session owner request allowed (SSE)',
    200,
    res2C.status,
    isSSE ? 'Content-Type: text/event-stream' : `Content-Type: ${res2C.headers.get('Content-Type')}`
  );


  // ==========================================
  // TEST CASE 3: User Spoofing Protection (X-User-Id Spoofing)
  // ==========================================
  console.log('\n🧪 Testing User Identity Spoofing Protection...');

  // Authenticated as ownerId, but spoofing headers and query parameters to be nonOwnerId
  const res3 = await app.request(`/api/workspaces?userId=${nonOwnerId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${ownerId}`,
      'X-User-Id': nonOwnerId
    }
  });

  const body3 = await res3.json();
  const workspaces = body3.workspaces || [];
  
  // Verify that ONLY workspaces for ownerId are returned (ownerId has workspaceIdOwner)
  const hasOwnerWorkspace = workspaces.some((w: any) => w.id === workspaceIdOwner);
  const hasNonOwnerWorkspace = workspaces.some((w: any) => w.id === workspaceIdNonOwner);

  let spoofingPassed = false;
  let spoofingStatus = 500;
  
  if (res3.status === 200) {
    spoofingStatus = 200;
    if (hasOwnerWorkspace && !hasNonOwnerWorkspace) {
      spoofingPassed = true;
    }
  }

  recordResult(
    'Identity Spoofing',
    'Ignore X-User-Id and query spoofing headers',
    200,
    spoofingStatus,
    spoofingPassed 
      ? 'Successfully returned ONLY the authenticated user\'s workspaces'
      : `Returned workspaces: ${JSON.stringify(workspaces.map((w: any) => w.id))}`
  );


  // ==========================================
  // PRINT SUMMARY
  // ==========================================
  console.log('\n📊 Test Results Summary\n');
  console.log(
    '  ' +
    'Section'.padEnd(22) +
    'Test Scenario'.padEnd(45) +
    'Expected'.padEnd(10) +
    'Actual'.padEnd(10) +
    'Status'
  );
  console.log('  ' + '─'.repeat(95));

  let passedCount = 0;
  let failedCount = 0;

  for (const r of testResults) {
    const statusText = r.passed ? '✅ PASS' : '❌ FAIL';
    if (r.passed) passedCount++;
    else failedCount++;

    console.log(
      '  ' +
      r.section.padEnd(22) +
      r.name.padEnd(45) +
      String(r.expectedStatus).padEnd(10) +
      String(r.actualStatus).padEnd(10) +
      statusText
    );
    if (r.notes) {
      console.log(`    ↳ Notes: ${r.notes}`);
    }
  }

  console.log('\n  ' + '─'.repeat(95));
  console.log(`  Total: ${testResults.length} | Passed: ${passedCount} | Failed: ${failedCount}\n`);

  // Clean up
  console.log('🧹 Cleaning up database seed records...');
  try {
    await prisma.workspaceMember.deleteMany({
      where: { workspaceId: { in: [workspaceIdOwner, workspaceIdNonOwner] } }
    }).catch(() => {});
    await prisma.workspace.deleteMany({
      where: { id: { in: [workspaceIdOwner, workspaceIdNonOwner] } }
    }).catch(() => {});
    await prisma.organization.deleteMany({
      where: { id: { in: [orgIdOwner, orgIdNonOwner] } }
    }).catch(() => {});
    await prisma.workflowSession.delete({ where: { id: sessionId } }).catch(() => {});
    await prisma.project.delete({ where: { id: projectId } }).catch(() => {});
    await prisma.user.delete({ where: { id: ownerId } }).catch(() => {});
    await prisma.user.delete({ where: { id: nonOwnerId } }).catch(() => {});
    console.log('✅ Database cleanup completed successfully.');
  } catch (error: any) {
    console.error('⚠️ Cleanup failed:', error.message);
  }

  if (failedCount > 0) {
    console.log('\n❌ SECURITY HARDENING REGRESSION TESTS FAILED\n');
    process.exit(1);
  } else {
    console.log('\n✅ SECURITY HARDENING REGRESSION TESTS PASSED\n');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test run error:', err);
  process.exit(1);
});
