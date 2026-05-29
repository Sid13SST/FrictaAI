import { prisma } from './src';
import {
  SharingManager,
  ThreadManager,
  AlertManager,
  DigestManager,
  MentionManager,
  DiscussionManager
} from '../integration-core/src';

async function seed() {
  console.log('--- Starting Collaboration & Communication Layer Seeding ---');

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

  // 2. Ensure we have at least one workflow session to reference
  let session = await prisma.workflowSession.findFirst({ where: { projectId: project.id } });
  if (!session) {
    session = await prisma.workflowSession.create({
      data: {
        projectId: project.id,
        goal: 'Complete onboarding walkthrough and verify workspace configuration',
        persona: 'STANDARD',
        status: 'COMPLETED',
        stepCount: 8,
        survivabilityRate: 72.5,
        cognitiveLoad: 48.2,
        startedAt: new Date(),
        endedAt: new Date(),
      }
    });
  }

  console.log(`Using workflow session: ${session.goal} (ID: ${session.id})`);

  // 3. Seed Shared Replay Session
  console.log('Seeding Shared Replay Session...');
  const sharedSession = await SharingManager.createShareToken({
    projectId: project.id,
    workflowSessionId: session.id,
    sharedWithEmail: 'reviewer@enterprise.com',
    notes: 'Please review step 3 and 4 where the drop in survivability rate happens.',
    expiresInDays: 7,
  });
  console.log(`  ✓ Created shared replay token: ${sharedSession.shareToken}`);

  // 4. Seed Investigation Thread (War Room)
  console.log('Seeding Investigation Thread...');
  const thread = await ThreadManager.createThread({
    projectId: project.id,
    title: 'Onboarding survivability drop on workspace creation step',
    workflowSessionId: session.id,
  });
  console.log(`  ✓ Created thread: "${thread.title}" (ID: ${thread.id})`);

  // 5. Seed Replay Annotations (Comments & timeline coordinates)
  console.log('Seeding Thread Annotations...');
  await ThreadManager.addAnnotation({
    threadId: thread.id,
    stepIndex: 3,
    author: 'developer_alpha@fricta.ai',
    content: 'The user clicked the CTA button but nothing loaded for 4 seconds, causing a huge cognitive load spike.',
    x: 42.5,
    y: 89.1,
  });

  await ThreadManager.addAnnotation({
    threadId: thread.id,
    stepIndex: 4,
    author: 'designer_beta@fricta.ai',
    content: 'Yes, looking at the layout, the loading spinner is hidden behind the header bar. Let @engineering fix the z-index.',
    x: 75.0,
    y: 12.4,
  });
  console.log('  ✓ Added timeline step annotations');

  // 6. Seed Mentions and general activities
  console.log('Seeding Team Mentions...');
  await MentionManager.recordMention({
    threadId: thread.id,
    mentionedUser: 'engineering',
    author: 'designer_beta@fricta.ai',
    content: 'Let @engineering fix the z-index.',
  });

  await MentionManager.recordMention({
    threadId: thread.id,
    mentionedUser: 'founder',
    author: 'system@fricta.ai',
    content: '@founder: High-severity onboarding incident flagged.',
  });
  console.log('  ✓ Registered mentions');

  // 7. Seed Operational Alert
  console.log('Seeding Operational Alerts...');
  const alert1 = await AlertManager.triggerAlert({
    projectId: project.id,
    alertType: 'SURVIVABILITY_DROP',
    severity: 'CRITICAL',
    message: 'Onboarding completion rate dropped below 75% critical threshold on staging environment.',
    workflowSessionId: session.id,
    channels: ['SLACK', 'EMAIL'],
    recipients: {
      SLACK: 'https://hooks.slack.com/services/mock-slack-url-123',
      EMAIL: 'founder@fricta.ai',
    },
  });

  const alert2 = await AlertManager.triggerAlert({
    projectId: project.id,
    alertType: 'COGNITIVE_OVERLOAD',
    severity: 'HIGH',
    message: 'Cognitive load spike (82.1%) detected on checkout verification layout.',
    workflowSessionId: session.id,
    channels: ['DISCORD'],
    recipients: {
      DISCORD: 'https://discord.com/api/webhooks/mock-discord-url-456',
    },
  });
  console.log('  ✓ Dispatched and logged operational alerts');

  // 8. Seed Digest Subscription
  console.log('Seeding Digest Subscriptions...');
  await DigestManager.subscribe(project.id, 'founder@fricta.ai', 'WEEKLY');
  await DigestManager.subscribe(project.id, 'vp_product@fricta.ai', 'DAILY');
  console.log('  ✓ Registered weekly/daily subscribers');

  // 9. Verification
  console.log('\nVerifying database records...');
  const [
    sharedCount,
    threadCount,
    annotationCount,
    collabCount,
    alertCount,
    escalationCount,
    digestCount,
    mentionCount
  ] = await Promise.all([
    prisma.sharedReplaySession.count(),
    prisma.investigationThread.count(),
    prisma.replayAnnotation.count(),
    prisma.collaborationEvent.count(),
    prisma.operationalAlert.count(),
    prisma.alertEscalation.count(),
    prisma.digestSubscription.count(),
    prisma.teamMentionEvent.count(),
  ]);

  console.log(`Verification Metrics:`);
  console.log(`- Shared Sessions:    ${sharedCount}`);
  console.log(`- Active Threads:     ${threadCount}`);
  console.log(`- Step Annotations:   ${annotationCount}`);
  console.log(`- Realtime Logs:      ${collabCount}`);
  console.log(`- Incidents Logged:   ${alertCount}`);
  console.log(`- Escalations Sent:   ${escalationCount}`);
  console.log(`- Digest Subs:        ${digestCount}`);
  console.log(`- Team @Mentions:     ${mentionCount}`);
  
  console.log('--- Collaboration & Communication Layer Seeding Complete ---');
}

seed()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
