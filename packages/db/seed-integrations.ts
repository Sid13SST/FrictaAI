import { prisma } from './src';
import {
  OAuthManager,
  FigmaConnector,
  FigJamConnector,
  JiraConnector,
  LinearConnector,
  GitHubConnector,
  NotionConnector,
  ProductboardConnector,
  IntegrationGovernanceLogger,
  WebhookHandler
} from '../integration-core/src';

async function seed() {
  console.log('--- Starting Integration Infrastructure Seeding ---');

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

  console.log(`Using user: ${user.email}, project: ${project.projectName}`);

  // 2. Register OAuth integrations (solo mode: workspaceId = null)
  console.log('Connecting 7 provider integrations...');
  const providers = [
    { provider: 'FIGMA' as const, token: 'fig-mock-token-001', userId: 'fig-user-123', org: 'fricta-design' },
    { provider: 'FIGJAM' as const, token: 'fig-mock-token-002', userId: 'fig-user-123', org: 'fricta-design' },
    { provider: 'NOTION' as const, token: 'notion-mock-token-001', userId: 'notion-user-456', org: 'fricta-notion' },
    { provider: 'JIRA' as const, token: 'jira-mock-token-001', userId: 'jira-user-789', org: 'fricta-atlassian' },
    { provider: 'LINEAR' as const, token: 'linear-mock-token-001', userId: 'linear-user-321', org: 'fricta-linear' },
    { provider: 'GITHUB' as const, token: 'gh-mock-token-001', userId: 'gh-user-654', org: 'fricta-gh-org' },
    { provider: 'PRODUCTBOARD' as const, token: 'pb-mock-token-001', userId: 'pb-user-987', org: 'fricta-pb' }
  ];

  const integrationMap: Record<string, any> = {};

  for (const p of providers) {
    const integration = await OAuthManager.upsertToken(
      null, p.provider, p.token, undefined, undefined,
      p.userId, p.org, 'read write',
      { seeded: true, connectedAt: new Date().toISOString() }
    );
    integrationMap[p.provider] = integration;
    console.log(`  ✓ Connected: ${p.provider} (ID: ${integration.id})`);
  }

  // 3. Register connections for each integration
  console.log('Registering provider connections...');
  const figmaIntegration = await prisma.workspaceIntegration.findFirst({ where: { provider: 'FIGMA' } });
  if (figmaIntegration) {
    await FigmaConnector.registerConnection(figmaIntegration.id, {
      fileId: 'fricta-design-system-001',
      fileName: 'Fricta Design System v2',
      fileUrl: 'https://figma.com/file/fricta-design-system-001'
    });
  }

  const linearIntegration = await prisma.workspaceIntegration.findFirst({ where: { provider: 'LINEAR' } });
  const connection = linearIntegration ? await prisma.integrationConnection.create({
    data: {
      workspaceIntegrationId: linearIntegration.id,
      provider: 'LINEAR',
      externalId: 'team-fricta-eng',
      externalName: 'Fricta Engineering',
      connectionType: 'TEAM',
      metadata: { teamId: 'team-fricta-eng' }
    }
  }) : null;

  const githubIntegration = await prisma.workspaceIntegration.findFirst({ where: { provider: 'GITHUB' } });
  if (githubIntegration) {
    await GitHubConnector.registerConnection(githubIntegration.id, {
      owner: 'fricta-ai', repo: 'fricta', repoUrl: 'https://github.com/fricta-ai/fricta'
    });
  }

  const jiraIntegration = await prisma.workspaceIntegration.findFirst({ where: { provider: 'JIRA' } });
  const jiraConnection = jiraIntegration ? await prisma.integrationConnection.create({
    data: {
      workspaceIntegrationId: jiraIntegration.id,
      provider: 'JIRA',
      externalId: 'FRICTA',
      externalName: 'Fricta Product',
      externalUrl: 'https://fricta.atlassian.net/projects/FRICTA',
      connectionType: 'PROJECT',
      metadata: { projectKey: 'FRICTA', baseUrl: 'https://fricta.atlassian.net' }
    }
  }) : null;

  console.log('  ✓ Provider connections registered');

  // 4. Define mock replay context
  const replayCtx = {
    sessionId: project.id,
    sessionGoal: 'Complete checkout flow',
    findingTitle: 'CTA button undiscoverable on mobile',
    findingSeverity: 'HIGH',
    cognitiveLoad: 74.5,
    survivabilityRate: 38.2,
    screenshotUrl: '/storage/screenshots/checkout-step-3.png',
    frictionScore: 8.7,
    stepIndex: 3
  };

  // 5. Create Figma replay link
  console.log('Creating Figma replay link...');
  const figmaConnection = await prisma.integrationConnection.findFirst({ where: { provider: 'FIGMA' } });
  if (figmaConnection) {
    await FigmaConnector.linkReplayToFrame(
      project.id, figmaConnection.id, project.id,
      'checkout-cta-node-001', 'Checkout CTA Button',
      'https://figma.com/file/fricta-design-system-001?node-id=checkout-cta-node-001',
      replayCtx
    );

    await FigmaConnector.attachFindingToFrame(
      project.id, figmaConnection.id, 'checkout-cta-node-001',
      {
        title: replayCtx.findingTitle!,
        description: 'The primary CTA button blends with the background on mobile viewports causing 62% survivability drop.',
        severity: 'HIGH',
        screenshotPath: replayCtx.screenshotUrl,
        cognitiveLoad: replayCtx.cognitiveLoad,
        survivabilityRate: replayCtx.survivabilityRate
      }
    );
    console.log('  ✓ Figma replay link and finding attachment created');
  }

  // 6. Create Jira ticket from finding
  console.log('Creating Jira ticket...');
  if (jiraConnection) {
    await JiraConnector.createTicketFromFinding(
      jiraConnection.id, project.id,
      { title: replayCtx.findingTitle!, description: 'CTA undiscoverable, causing checkout abandonment.', severity: 'HIGH' },
      replayCtx,
      { baseUrl: 'https://fricta.atlassian.net', projectKey: 'FRICTA', issueType: 'Bug' }
    );
    console.log('  ✓ Jira ticket created');
  }

  // 7. Create Linear task
  console.log('Creating Linear task...');
  if (connection) {
    await LinearConnector.createTaskFromFinding(
      connection.id, project.id,
      { title: replayCtx.findingTitle!, description: 'CTA visibility fix required.', severity: 'HIGH', priority: 'HIGH' },
      replayCtx,
      { teamId: 'team-fricta-eng' }
    );
    console.log('  ✓ Linear task created');
  }

  // 8. Create GitHub PR link
  console.log('Creating GitHub PR link...');
  const ghConnection = await prisma.integrationConnection.findFirst({ where: { provider: 'GITHUB' } });
  if (ghConnection) {
    await GitHubConnector.linkFindingToPR(
      ghConnection.id, project.id, 247,
      'feat: improve checkout CTA visibility',
      'https://github.com/fricta-ai/fricta/pull/247',
      { title: replayCtx.findingTitle!, description: 'CTA undiscoverable.', severity: 'HIGH' },
      replayCtx,
      { owner: 'fricta-ai', repo: 'fricta' }
    );
    console.log('  ✓ GitHub PR replay link created');
  }

  // 9. Notion evidence page
  console.log('Creating Notion evidence page...');
  const notionIntegration = await prisma.workspaceIntegration.findFirst({ where: { provider: 'NOTION' } });
  const notionConnection = notionIntegration ? await prisma.integrationConnection.create({
    data: {
      workspaceIntegrationId: notionIntegration.id,
      provider: 'NOTION',
      externalId: 'notion-db-fricta-ux',
      externalName: 'Fricta UX Research',
      connectionType: 'PROJECT'
    }
  }) : null;

  if (notionConnection) {
    await NotionConnector.createEvidencePage(
      notionConnection.id, project.id,
      { title: replayCtx.findingTitle!, description: 'CTA undiscoverable on mobile.', severity: 'HIGH' },
      replayCtx, { databaseId: 'notion-db-fricta-ux' }
    );
    console.log('  ✓ Notion evidence page created');
  }

  // 10. Productboard evidence routing
  console.log('Routing evidence to Productboard...');
  const pbIntegration = await prisma.workspaceIntegration.findFirst({ where: { provider: 'PRODUCTBOARD' } });
  const pbConnection = pbIntegration ? await prisma.integrationConnection.create({
    data: {
      workspaceIntegrationId: pbIntegration.id,
      provider: 'PRODUCTBOARD',
      externalId: 'pb-workspace-fricta',
      externalName: 'Fricta Product',
      connectionType: 'PROJECT'
    }
  }) : null;

  if (pbConnection) {
    await ProductboardConnector.routeEvidenceToFeature(
      pbConnection.id, project.id, 'pb-feature-checkout-cta',
      'Checkout CTA Visibility',
      { title: replayCtx.findingTitle!, description: 'High-severity UX finding.', severity: 'HIGH' },
      replayCtx
    );
    console.log('  ✓ Productboard evidence routed');
  }

  // 11. Governance audit logs
  await IntegrationGovernanceLogger.log('FIGMA', 'CONNECT', 'Figma integration seeded', null, user.id, undefined, true);
  await IntegrationGovernanceLogger.log('JIRA', 'TICKET_CREATED', 'Jira seed ticket created', null, user.id, 'FRICTA-1001', true);

  // 12. Verification
  console.log('\nVerifying database records...');
  const [integCount, connCount, linkCount, attachCount, refCount, jobsCount, auditCount] = await Promise.all([
    prisma.workspaceIntegration.count(),
    prisma.integrationConnection.count(),
    prisma.replayLink.count(),
    prisma.evidenceAttachment.count(),
    prisma.externalReference.count(),
    prisma.syncJob.count(),
    prisma.integrationAuditEvent.count()
  ]);

  console.log(`Verification Metrics:`);
  console.log(`- Workspace Integrations: ${integCount}`);
  console.log(`- Provider Connections:   ${connCount}`);
  console.log(`- Replay Links:           ${linkCount}`);
  console.log(`- Evidence Attachments:   ${attachCount}`);
  console.log(`- External References:    ${refCount}`);
  console.log(`- Sync Jobs:              ${jobsCount}`);
  console.log(`- Governance Audit Events:${auditCount}`);
  console.log('--- Integration Infrastructure Seeding Complete ---');
}

seed()
  .catch(err => { console.error('Seeding failed:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
