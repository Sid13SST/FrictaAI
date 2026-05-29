import { prisma } from './src';
import { ApiKeyManager } from '../developer-platform/src';

async function seed() {
  console.log('--- Starting Developer Platform Seeding ---');

  // 1. Ensure user and project exist
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({ data: { email: 'founder@fricta.ai', name: 'Fricta Founder' } });
  }

  let project = await prisma.project.findFirst({ where: { userId: user.id } });
  if (!project) {
    project = await prisma.project.create({
      data: { userId: user.id, projectName: 'Fricta Core App', websiteUrl: 'https://fricta.ai' }
    });
  }

  console.log(`Using user: ${user.email}, project: ${project.projectName} (ID: ${project.id})`);

  // 2. Ensure an ExecutiveReport exists
  let report = await prisma.executiveReport.findFirst({ where: { projectId: project.id } });
  if (!report) {
    report = await prisma.executiveReport.create({
      data: {
        projectId: project.id,
        title: 'Weekly Q2 Usability Benchmark Report',
        summary: 'Overall user survivability has stabilized at 87% with minor regressions caught on workspace integrations.',
        stabilityScore: 87.2,
        completionRate: 91.5,
        riskLevel: 'MEDIUM',
        sections: [
          { type: 'text', title: 'Scope', content: 'Audited landing checkout paths and API key setups.' }
        ],
        createdById: user.id,
      }
    });
  }

  console.log(`Using executive report: "${report.title}" (ID: ${report.id})`);

  // 3. Seed Developer Application
  console.log('Seeding Developer Application...');
  const app = await prisma.developerApplication.upsert({
    where: { clientId: 'fricta_client_q1w2e3r4t5y6' },
    update: {},
    create: {
      projectId: project.id,
      name: 'Fricta Slack Sync App',
      clientId: 'fricta_client_q1w2e3r4t5y6',
      clientSecret: 'fricta_sec_9u8i7o6p5l4k3j2h1g',
      redirectUris: ['http://localhost:3000/oauth/callback'],
    },
  });
  console.log(`  ✓ Seeding App: "${app.name}"`);

  // 4. Seed API Keys
  console.log('Seeding API Keys...');
  const key1 = await ApiKeyManager.generateKey({
    projectId: project.id,
    name: 'Production Server Integration Key',
    scopes: ['read:replays', 'read:findings', 'write:webhooks'],
  });
  console.log(`  ✓ Generated key "${key1.name}": ${key1.plaintextKey}`);

  const key2 = await ApiKeyManager.generateKey({
    projectId: project.id,
    name: 'CI/CD Pipeline Verification Key',
    scopes: ['read:replays', 'read:findings'],
    expiresInDays: 30,
  });
  console.log(`  ✓ Generated key "${key2.name}": ${key2.plaintextKey}`);

  // 5. Seed Webhook Endpoints
  console.log('Seeding Webhook Endpoints...');
  const webhook = await prisma.webhookEndpoint.create({
    data: {
      projectId: project.id,
      url: 'mock:webhook-channel-receiver',
      secret: 'whsec_fricta_platform_secret_key_001',
      events: ['SessionCompleted', 'FindingGenerated', 'AlertTriggered'],
      active: true,
    },
  });
  console.log(`  ✓ Seeded Webhook URL: ${webhook.url}`);

  // 6. Seed Webhook Delivery logs
  console.log('Seeding Webhook Delivery Logs...');
  await prisma.webhookDelivery.create({
    data: {
      endpointId: webhook.id,
      eventType: 'FindingGenerated',
      payload: {
        findingId: 'find_mock_123',
        severity: 'CRITICAL',
        title: 'Broken submit button on registration form',
      },
      statusCode: 200,
      success: true,
      retryCount: 0,
    },
  });

  await prisma.webhookDelivery.create({
    data: {
      endpointId: webhook.id,
      eventType: 'SessionCompleted',
      payload: {
        sessionId: 'session_mock_456',
        survivabilityRate: 92.4,
      },
      statusCode: 502,
      success: false,
      errorMessage: 'Bad Gateway',
      retryCount: 2,
    },
  });
  console.log('  ✓ Seeded Webhook deliveries');

  // 7. Seed Platform Audit Log events
  console.log('Seeding Platform Audit Log events...');
  await prisma.platformAuditEvent.create({
    data: {
      projectId: project.id,
      actor: `ApiKey:${key1.keyId}`,
      action: 'API_REPLAYS_QUERY',
      resource: 'replays:list',
      status: 'SUCCESS',
      ipAddress: '127.0.0.1',
    },
  });
  console.log('  ✓ Seeded platform audit trails');

  // 8. Verification
  console.log('\nVerifying Developer Platform database records...');
  const [
    apiKeysCount,
    webhooksCount,
    deliveriesCount,
    appsCount,
    auditsCount
  ] = await Promise.all([
    prisma.apiKey.count(),
    prisma.webhookEndpoint.count(),
    prisma.webhookDelivery.count(),
    prisma.developerApplication.count(),
    prisma.platformAuditEvent.count(),
  ]);

  console.log(`Verification Metrics:`);
  console.log(`- API Keys:        ${apiKeysCount}`);
  console.log(`- Webhook Links:   ${webhooksCount}`);
  console.log(`- Deliveries Sent: ${deliveriesCount}`);
  console.log(`- Dev Applications:${appsCount}`);
  console.log(`- Platform Audits: ${auditsCount}`);
  
  console.log('--- Developer Platform Seeding Complete ---');
}

seed()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
