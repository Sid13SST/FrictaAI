import { prisma } from './src';

async function seed() {
  console.log('--- Starting Telemetry Database Seeding ---');

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

  console.log(`Using project: ${project.projectName} (ID: ${project.id})`);

  // 2. Clear old telemetry records for fresh state
  await prisma.telemetryAuditRecord.deleteMany({ where: { projectId: project.id } });
  await prisma.liveSession.deleteMany({ where: { projectId: project.id } });

  // 3. Create Session 1: Clean flow (Chrome on macOS, USA)
  console.log('Seeding LiveSession 1 (Chrome - Clean flow)...');
  const session1 = await prisma.liveSession.create({
    data: {
      projectId: project.id,
      sessionKey: 'fricta_sess_chrome_mac_usa_001',
      userId: 'user_active_888',
      browser: 'Chrome',
      os: 'macOS',
      device: 'Desktop',
      ipAddress: '64.233.160.1',
      location: 'San Francisco, USA',
      status: 'ACTIVE',
    }
  });

  await prisma.navigationEvent.createMany({
    data: [
      { liveSessionId: session1.id, fromUrl: 'https://fricta.ai/home', toUrl: 'https://fricta.ai/onboarding', durationMs: 0, timestamp: new Date(Date.now() - 50000) },
      { liveSessionId: session1.id, fromUrl: 'https://fricta.ai/onboarding', toUrl: 'https://fricta.ai/dashboard', durationMs: 4000, timestamp: new Date(Date.now() - 20000) },
    ]
  });

  await prisma.telemetryInteractionEvent.createMany({
    data: [
      { liveSessionId: session1.id, target: 'a#get-started', elementType: 'A', action: 'CLICK', timestamp: new Date(Date.now() - 48000) },
      { liveSessionId: session1.id, target: 'input#username', elementType: 'INPUT', action: 'INPUT', timestamp: new Date(Date.now() - 35000) },
      { liveSessionId: session1.id, target: 'button#submit-profile', elementType: 'BUTTON', action: 'CLICK', timestamp: new Date(Date.now() - 22000) },
    ]
  });

  await prisma.sessionHeartbeat.createMany({
    data: [
      { liveSessionId: session1.id, sequenceNumber: 1, activeDurationSeconds: 30, timestamp: new Date(Date.now() - 30000) },
      { liveSessionId: session1.id, sequenceNumber: 2, activeDurationSeconds: 60, timestamp: new Date() },
    ]
  });

  // 4. Create Session 2: Friction flow (Firefox on Windows, UK)
  console.log('Seeding LiveSession 2 (Firefox - High Friction)...');
  const session2 = await prisma.liveSession.create({
    data: {
      projectId: project.id,
      sessionKey: 'fricta_sess_firefox_win_uk_002',
      userId: 'user_friction_999',
      browser: 'Firefox',
      os: 'Windows',
      device: 'Desktop',
      ipAddress: '82.165.2.1',
      location: 'London, UK',
      status: 'ACTIVE',
    }
  });

  await prisma.navigationEvent.createMany({
    data: [
      { liveSessionId: session2.id, fromUrl: 'https://fricta.ai/home', toUrl: 'https://fricta.ai/checkout', durationMs: 0, timestamp: new Date(Date.now() - 90000) },
    ]
  });

  await prisma.telemetryInteractionEvent.createMany({
    data: [
      { liveSessionId: session2.id, target: 'button#pay-button', elementType: 'BUTTON', action: 'CLICK', timestamp: new Date(Date.now() - 75000) },
      { liveSessionId: session2.id, target: 'button#pay-button', elementType: 'BUTTON', action: 'CLICK', timestamp: new Date(Date.now() - 74800) },
      { liveSessionId: session2.id, target: 'button#pay-button', elementType: 'BUTTON', action: 'CLICK', timestamp: new Date(Date.now() - 74600) },
      { liveSessionId: session2.id, target: 'button#pay-button', elementType: 'BUTTON', action: 'CLICK', timestamp: new Date(Date.now() - 74400) },
      { liveSessionId: session2.id, target: 'button#pay-button', elementType: 'BUTTON', action: 'CLICK', timestamp: new Date(Date.now() - 74200) },
    ]
  });

  // Log Rage Click friction
  await prisma.frictionSignal.create({
    data: {
      liveSessionId: session2.id,
      frictionType: 'RAGE_CLICK',
      score: 0.95,
      details: { target: 'button#pay-button', clickCount: 5, elementText: 'Pay Now' },
      timestamp: new Date(Date.now() - 74000),
    }
  });

  await prisma.sessionSignal.create({
    data: {
      liveSessionId: session2.id,
      signalType: 'FRICTION',
      severity: 'CRITICAL',
      description: 'Multiple clicks detected on unresponsive checkout button (button#pay-button)',
      timestamp: new Date(Date.now() - 74000),
    }
  });

  // Log custom script error signal
  await prisma.sessionSignal.create({
    data: {
      liveSessionId: session2.id,
      signalType: 'SCRIPT_ERROR',
      severity: 'HIGH',
      description: 'Uncaught TypeError: Cannot read properties of undefined (reading "chargeCard") at checkout.js:45',
      timestamp: new Date(Date.now() - 73800),
    }
  });

  // 5. Create Session 3: Completed Checkout (Safari on iOS, France)
  console.log('Seeding LiveSession 3 (Safari Mobile - Completion)...');
  const session3 = await prisma.liveSession.create({
    data: {
      projectId: project.id,
      sessionKey: 'fricta_sess_safari_ios_fra_003',
      userId: 'user_success_777',
      browser: 'Safari',
      os: 'iOS',
      device: 'Mobile',
      ipAddress: '195.154.122.1',
      location: 'Paris, France',
      status: 'COMPLETED',
    }
  });

  await prisma.navigationEvent.createMany({
    data: [
      { liveSessionId: session3.id, fromUrl: 'https://fricta.ai/checkout', toUrl: 'https://fricta.ai/success', durationMs: 0, timestamp: new Date(Date.now() - 100000) },
    ]
  });

  await prisma.sessionSignal.create({
    data: {
      liveSessionId: session3.id,
      signalType: 'WORKFLOW_COMPLETION',
      severity: 'LOW',
      description: 'User successfully reached thank you page and finished checkout.',
      timestamp: new Date(Date.now() - 98000),
    }
  });

  // 6. Create Telemetry Audit Records for compliance
  await prisma.telemetryAuditRecord.createMany({
    data: [
      { projectId: project.id, actionType: 'CONSENT_GRANT', details: { sessionKey: 'fricta_sess_chrome_mac_usa_001', consentLevel: 'all' }, timestamp: new Date(Date.now() - 55000) },
      { projectId: project.id, actionType: 'INGESTION', details: { sessionKey: 'fricta_sess_firefox_win_uk_002', batchSize: 5 }, timestamp: new Date(Date.now() - 70000) }
    ]
  });

  // Verify counts
  const sessionsCount = await prisma.liveSession.count({ where: { projectId: project.id } });
  const navsCount = await prisma.navigationEvent.count();
  const clicksCount = await prisma.telemetryInteractionEvent.count();
  const signalsCount = await prisma.sessionSignal.count();
  const auditsCount = await prisma.telemetryAuditRecord.count();

  console.log('\nVerification metrics:');
  console.log(`- Live Sessions:  ${sessionsCount}`);
  console.log(`- Nav Events:     ${navsCount}`);
  console.log(`- Click Events:   ${clicksCount}`);
  console.log(`- Signals Logged: ${signalsCount}`);
  console.log(`- Audit Records:  ${auditsCount}`);

  console.log('--- Telemetry Seeding Complete ---');
}

seed()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
