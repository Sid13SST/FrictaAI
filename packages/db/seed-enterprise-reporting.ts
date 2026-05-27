import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for Enterprise Reporting models...');

  // 1. Fetch default user & workspace
  const user = await prisma.user.findFirst();
  const workspace = await prisma.workspace.findFirst();
  const project = await prisma.project.findFirst({
    include: { sessions: true }
  });

  if (!user || !workspace || !project) {
    console.error('❌ User, Workspace, or Project not found. Please run seed-workspace-core & seed-rbac-core first.');
    process.exit(1);
  }

  console.log(`Resolved Workspace: "${workspace.name}" (ID: ${workspace.id})`);
  console.log(`Resolved Project: "${project.projectName}" (ID: ${project.id})`);

  // 2. Seed Report Templates
  const templateTypes = [
    { name: 'Executive Risk Audit', type: 'RISK_REPORT', desc: 'Focuses on critical cognitive friction loops and UI barriers.' },
    { name: 'Product Release Review', type: 'PRODUCT_RELEASE', desc: 'Pre-production readiness checkpoints and stability scores.' },
    { name: 'Predictive Intelligence Forecast', type: 'PREDICTIVE_INTEL', desc: 'Simulated projections showing drop-off curves.' },
    { name: 'Persona Friction Distribution', type: 'PERSONA_ANALYSIS', desc: 'User experience indicators split by demographics.' }
  ];

  for (const t of templateTypes) {
    await prisma.reportTemplate.create({
      data: {
        workspaceId: workspace.id,
        name: t.name,
        description: t.desc,
        layoutType: t.type,
        structure: {
          accentColor: '#10b981',
          headerImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
          sections: [
            { id: 'sec-1', title: 'Scope Details', type: 'SUMMARY', content: 'Details describing the audit boundary.' }
          ]
        },
        isSystem: true
      }
    });
  }
  console.log('Seeded 4 modular report templates.');

  // 3. Create mock Executive Report
  const sections = [
    {
      id: 'sec-summary',
      title: 'Executive Summary',
      content: 'Longitudinal analysis reveals significant improvements in checkout pathways, though onboarding overlays continue to register form field fatigue under power user workloads.',
      type: 'SUMMARY'
    },
    {
      id: 'sec-risk-overview',
      title: 'Primary UX Risks & Structural Hazards',
      content: 'Critical CTA misplacements in settings panels have escalated to high priority status. Visual prominence of secondary buttons conflicts with progression direction.',
      type: 'RISK_OVERVIEW',
      metadata: { criticalCount: 2, highCount: 5 }
    },
    {
      id: 'sec-stability',
      title: 'Stability & Completion Metrics',
      content: 'The user pathways register a composite Stability Score of 84/100, which is stable (+4%) against the last release baseline.',
      type: 'STABILITY_METRICS',
      metadata: { stabilityScore: 84, completionRate: 0.88 }
    }
  ];

  const report = await prisma.executiveReport.create({
    data: {
      workspaceId: workspace.id,
      projectId: project.id,
      title: 'Q2 Core Workflow Usability Report',
      summary: 'Checkout pathways register a composite Stability Score of 84/100, which is stable (+4%) against the last release baseline.',
      stabilityScore: 84.0,
      completionRate: 0.88,
      riskLevel: 'HIGH',
      sections: sections as any,
      createdById: user.id
    }
  });
  console.log(`Seeded Executive Report: "${report.title}"`);

  // 4. Seed Evidence Links
  const session = project.sessions[0];
  if (session) {
    // Check if we have screenshot or cognitive signals
    const screenshot = await prisma.workflowScreenshot.findFirst({
      where: { workflowSessionId: session.id }
    });
    const signal = await prisma.cognitiveSignal.findFirst({
      where: { workflowSessionId: session.id }
    });

    if (screenshot) {
      await prisma.reportEvidenceLink.create({
        data: {
          reportId: report.id,
          evidenceType: 'SCREENSHOT',
          evidenceId: screenshot.id,
          notes: 'Visual validation showing CTA button overlaps at the footer viewport.'
        }
      });
      console.log('Linked screenshot evidence to executive report.');
    }

    if (signal) {
      await prisma.reportEvidenceLink.create({
        data: {
          reportId: report.id,
          evidenceType: 'COGNITIVE_SIGNAL',
          evidenceId: signal.id,
          notes: 'Cognitive signal peak logging severe choice density spike during layout selection.'
        }
      });
      console.log('Linked cognitive signal evidence to executive report.');
    }
  }

  // 5. Seed Report Exports
  const formats = ['PDF', 'PRESENTATION', 'CSV'];
  for (const f of formats) {
    await prisma.reportExport.create({
      data: {
        reportId: report.id,
        format: f,
        status: 'COMPLETED',
        filePath: `/exports/${f.toLowerCase()}-${report.id}.${f === 'PDF' ? 'pdf' : f === 'PRESENTATION' ? 'json' : 'csv'}`,
        metadata: { sizeBytes: 153021, generatedAt: new Date().toISOString() },
        createdById: user.id
      }
    });
  }
  console.log('Seeded 3 generated exports history.');

  // 6. Seed Shared Report Links
  const share = await prisma.sharedReport.create({
    data: {
      reportId: report.id,
      token: 'mock-boardroom-report-share-token-2026',
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
      maxUses: 50,
      recipientEmail: 'board.members@fricta.ai',
      createdById: user.id
    }
  });
  console.log(`Seeded shared link token: "${share.token}"`);

  // 7. Seed Distribution Events
  await prisma.reportDistributionEvent.create({
    data: {
      reportId: report.id,
      channel: 'EMAIL',
      recipient: 'board.members@fricta.ai',
      status: 'SENT',
      sentById: user.id
    }
  });
  await prisma.reportDistributionEvent.create({
    data: {
      reportId: report.id,
      channel: 'WEBHOOK',
      recipient: 'https://hooks.slack.com/services/mock-fricta-reporting',
      status: 'SENT',
      sentById: user.id
    }
  });
  console.log('Seeded 2 mock report distribution webhook logs.');

  // 8. Seed Workspace Insight Digests
  const digests = [
    { title: 'Weekly UX Health Digest', period: 'WEEKLY' },
    { title: 'Monthly Executive Summary Digest', period: 'MONTHLY' }
  ];

  for (const d of digests) {
    await prisma.workspaceInsightDigest.create({
      data: {
        workspaceId: workspace.id,
        title: d.title,
        digestPeriod: d.period,
        metricsSummary: {
          averageStability: 82,
          totalRunsThisPeriod: 14,
          projectsAuditedCount: 2
        },
        topRisks: [
          { project: project.projectName, type: 'COGNITIVE_OVERLOAD', severity: 'HIGH', notes: 'Checkout path clutter causes drop-offs.' }
        ],
        deliveredAt: new Date()
      }
    });
  }
  console.log('Seeded 2 workspace health digests.');

  console.log('✅ Enterprise Reporting database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
