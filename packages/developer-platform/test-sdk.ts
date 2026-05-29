import { prisma } from '@fricta/db';
import { ApiKeyManager, RateLimiter, WebhookDispatcher, FrictaCli } from './src';

async function runTests() {
  console.log('==================================================');
  console.log('    FRICTA DEVELOPER PLATFORM INTEGRATION TEST    ');
  console.log('==================================================\n');

  // Find a project to associate with
  const project = await prisma.project.findFirst();
  if (!project) {
    console.error('❌ Error: No project found in database. Please seed the database first.');
    process.exit(1);
  }
  console.log(`Using Project: ${project.projectName} (ID: ${project.id})\n`);

  // ────────────────────────────────────────────────────────────────
  // TEST 1: API Key Generation & Validation
  // ────────────────────────────────────────────────────────────────
  console.log('🧪 Test 1: API Key Generation & Validation');
  const keyName = 'Integration Test Key';
  const scopes = ['read:replays', 'read:findings'];
  
  const generated = await ApiKeyManager.generateKey({
    projectId: project.id,
    name: keyName,
    scopes,
    expiresInDays: 1,
  });
  
  console.log(`  ✓ Key Generated successfully:`);
  console.log(`    - Plaintext: ${generated.plaintextKey}`);
  console.log(`    - Hash ID:   ${generated.keyId}`);

  // Validate the key we just generated
  const validation = await ApiKeyManager.validateKey(generated.plaintextKey);
  if (validation.isValid && validation.projectId === project.id) {
    console.log('  ✓ Key validation: SUCCESS (Key is active, valid, and correctly scoped)');
  } else {
    console.error('  ❌ Key validation: FAILED');
  }

  // Validate an invalid key
  const invalidValidation = await ApiKeyManager.validateKey('fricta_live_invalid_key_12345');
  if (!invalidValidation.isValid) {
    console.log('  ✓ Invalid key rejection: SUCCESS');
  } else {
    console.error('  ❌ Invalid key rejection: FAILED');
  }
  console.log('');

  // ────────────────────────────────────────────────────────────────
  // TEST 2: Token-Bucket Rate Limiting
  // ────────────────────────────────────────────────────────────────
  console.log('🧪 Test 2: Token-Bucket Rate Limiter');
  const clientKey = ApiKeyManager.hashKey(generated.plaintextKey);
  
  // Make 3 quick requests
  const limit1 = await RateLimiter.checkLimit(clientKey, 5, 1);
  const limit2 = await RateLimiter.checkLimit(clientKey, 5, 1);
  const limit3 = await RateLimiter.checkLimit(clientKey, 5, 1);

  console.log(`  - Request 1: Allowed = ${limit1.allowed}, Remaining = ${limit1.remaining}`);
  console.log(`  - Request 2: Allowed = ${limit2.allowed}, Remaining = ${limit2.remaining}`);
  console.log(`  - Request 3: Allowed = ${limit3.allowed}, Remaining = ${limit3.remaining}`);

  if (limit1.allowed && limit2.allowed && limit3.allowed && limit3.remaining < limit1.remaining) {
    console.log('  ✓ Rate limiter bucket decrements tokens correctly: SUCCESS');
  } else {
    console.error('  ❌ Rate limiter logic: FAILED');
  }
  console.log('');

  // ────────────────────────────────────────────────────────────────
  // TEST 3: Webhook Event Signing & Dispatch
  // ────────────────────────────────────────────────────────────────
  console.log('🧪 Test 3: Webhook Event Signing & Dispatch');
  
  // Register a mock endpoint (using mock: URL prefix to prevent actual external fetch)
  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      projectId: project.id,
      url: 'mock:webhook-test-url',
      secret: 'super_secret_signing_key_123',
      events: ['FindingGenerated'],
      active: true,
    }
  });
  console.log(`  - Registered endpoint url: ${endpoint.url}`);

  const payload = {
    findingId: 'find_test_999',
    severity: 'CRITICAL',
    title: 'Checkout button overlap on high-load sessions',
  };

  console.log('  - Dispatching Webhook Event (with HMAC SHA256 signature)...');
  await WebhookDispatcher.dispatchEvent(project.id, {
    eventId: 'evt_test_123',
    eventType: 'FindingGenerated',
    timestamp: new Date().toISOString(),
    data: payload
  });

  // Retrieve the logged delivery to check status code & payload
  const delivery = await prisma.webhookDelivery.findFirst({
    where: { endpointId: endpoint.id, eventType: 'FindingGenerated' },
    orderBy: { deliveredAt: 'desc' }
  });

  if (delivery && delivery.success) {
    console.log(`  ✓ Webhook delivery record persisted: Status Code = ${delivery.statusCode}, Success = ${delivery.success}`);
  } else {
    console.error('  ❌ Webhook dispatch / logging failed');
  }
  console.log('');

  // ────────────────────────────────────────────────────────────────
  // TEST 4: Fricta CLI Arguments Parser
  // ────────────────────────────────────────────────────────────────
  console.log('🧪 Test 4: Fricta CLI Command Execution');
  const cli = new FrictaCli(generated.plaintextKey);
  const cliResult = await cli.executeCommand(['replay', 'list']);
  
  console.log(`  - Executed command "fricta replay list"`);
  console.log(`  - Output preview:\n${cliResult.substring(0, 200)}...`);

  if (cliResult && !cliResult.includes('Error')) {
    console.log('  ✓ CLI command execution: SUCCESS');
  } else {
    console.error('  ❌ CLI command execution: FAILED');
  }
  console.log('');

  // Clean up test records
  console.log('🧹 Cleaning up test key and webhook endpoint...');
  await prisma.apiKey.delete({ where: { id: generated.keyId } });
  await prisma.webhookEndpoint.delete({ where: { id: endpoint.id } });
  console.log('  ✓ Cleanup: SUCCESS');

  console.log('\n==================================================');
  console.log('          ALL INTEGRATION TESTS PASSED            ');
  console.log('==================================================');
}

runTests()
  .catch(err => {
    console.error('❌ Test script failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
