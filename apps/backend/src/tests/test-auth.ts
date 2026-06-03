/**
 * Backend Authentication Validation Script
 *
 * Tests that Clerk JWT authentication is properly enforced on the Fricta backend.
 * Run with: npx tsx apps/backend/src/tests/test-auth.ts
 *
 * Prerequisites:
 *   - Backend server running on port 3001
 *   - CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY configured in .env
 *
 * Note: For the "valid token" test, you need a real Clerk session token.
 *       Get one from the browser console: await window.__clerk__.session.getToken()
 *       Pass it as an environment variable: CLERK_TEST_TOKEN=xxx npx tsx ...
 */

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:3001';
const VALID_TOKEN = process.env.CLERK_TEST_TOKEN || '';

interface TestResult {
  name: string;
  endpoint: string;
  expected: number;
  actual: number | string;
  passed: boolean;
  body?: string;
}

const results: TestResult[] = [];

async function test(
  name: string,
  endpoint: string,
  expectedStatus: number,
  options?: RequestInit
): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    const body = await res.text().catch(() => '');
    results.push({
      name,
      endpoint,
      expected: expectedStatus,
      actual: res.status,
      passed: res.status === expectedStatus,
      body: body.slice(0, 200),
    });
  } catch (err: any) {
    results.push({
      name,
      endpoint,
      expected: expectedStatus,
      actual: `ERROR: ${err.message}`,
      passed: false,
    });
  }
}

async function runTests() {
  console.log('\n🔒 Fricta Backend Auth Validation\n');
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   Token:  ${VALID_TOKEN ? '✅ Provided' : '⚠️  Not provided (valid token test will be skipped)'}\n`);
  console.log('─'.repeat(80));

  // ─── PUBLIC ROUTES (should return 200 without token) ──────────────────────

  await test(
    'Health check (root)',
    '/health',
    200
  );

  await test(
    'Health check (API)',
    '/api/health',
    200
  );

  // ─── PROTECTED ROUTES - NO TOKEN (should return 401) ──────────────────────

  await test(
    'Projects (no token)',
    '/api/projects',
    401
  );

  await test(
    'Workflows (no token)',
    '/api/workflows',
    401
  );

  await test(
    'Reports (no token)',
    '/api/reports',
    401
  );

  await test(
    'Agent workflow status (no token)',
    '/api/agent/workflow/test-id/status',
    401
  );

  await test(
    'Orchestrator (no token)',
    '/api/orchestrator',
    401
  );

  await test(
    'Intelligence (no token)',
    '/api/intelligence',
    401
  );

  // ─── PROTECTED ROUTES - INVALID TOKEN (should return 401) ─────────────────

  await test(
    'Projects (invalid token)',
    '/api/projects',
    401,
    { headers: { 'Authorization': 'Bearer invalid_token_abc123' } }
  );

  await test(
    'Projects (malformed header)',
    '/api/projects',
    401,
    { headers: { 'Authorization': 'NotBearer some_value' } }
  );

  // ─── PROTECTED ROUTES - VALID TOKEN (should return 200) ───────────────────

  if (VALID_TOKEN) {
    await test(
      'Projects (valid token)',
      '/api/projects',
      200,
      { headers: { 'Authorization': `Bearer ${VALID_TOKEN}` } }
    );

    await test(
      'Reports (valid token)',
      '/api/reports',
      200,
      { headers: { 'Authorization': `Bearer ${VALID_TOKEN}` } }
    );
  }

  // ─── PUBLIC API (API key auth, not Clerk) ─────────────────────────────────

  await test(
    'Public API (no key)',
    '/api/public/replays',
    401
  );

  // ─── RESULTS ──────────────────────────────────────────────────────────────

  console.log('\n📊 Results\n');
  console.log(
    '  ' +
    'Test'.padEnd(40) +
    'Endpoint'.padEnd(30) +
    'Expected'.padEnd(10) +
    'Actual'.padEnd(10) +
    'Status'
  );
  console.log('  ' + '─'.repeat(100));

  let passed = 0;
  let failed = 0;

  for (const r of results) {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    if (r.passed) passed++;
    else failed++;

    console.log(
      '  ' +
      r.name.padEnd(40) +
      r.endpoint.padEnd(30) +
      String(r.expected).padEnd(10) +
      String(r.actual).padEnd(10) +
      status
    );
  }

  console.log('\n  ' + '─'.repeat(100));
  console.log(`  Total: ${results.length} | Passed: ${passed} | Failed: ${failed}\n`);

  if (failed > 0) {
    console.log('  ❌ SOME TESTS FAILED\n');
    for (const r of results.filter(r => !r.passed)) {
      console.log(`  FAIL: ${r.name}`);
      console.log(`    Expected: ${r.expected}, Got: ${r.actual}`);
      if (r.body) console.log(`    Body: ${r.body}`);
    }
    process.exit(1);
  } else {
    console.log('  ✅ ALL TESTS PASSED\n');
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
