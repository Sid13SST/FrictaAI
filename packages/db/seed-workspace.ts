import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Collaborative Workspace database seeding...');

  // 1. Ensure we have a default user
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'default-user@fricta.ai',
        name: 'Default User',
      },
    });
    console.log(`Created default user: ${user.email}`);
  }

  // 2. Create organization
  const org = await prisma.organization.create({
    data: {
      name: 'Fricta Enterprise Org',
    },
  });
  console.log(`Created Organization: ${org.name}`);

  // 3. Create workspaces
  const ws1 = await prisma.workspace.create({
    data: {
      organizationId: org.id,
      name: 'Production Analytics Workspace',
      description: 'Production monitoring and core product metrics',
    },
  });
  const ws2 = await prisma.workspace.create({
    data: {
      organizationId: org.id,
      name: 'Staging Experiments Workspace',
      description: 'Sandbox for staging tests and design sprints',
    },
  });
  console.log(`Created Workspaces: "${ws1.name}", "${ws2.name}"`);

  // 4. Create teams
  const team1 = await prisma.team.create({
    data: {
      organizationId: org.id,
      name: 'UX Quality Assurance Team',
      description: 'Focuses on friction loop reviews and onboarding improvements',
    },
  });
  console.log(`Created Team: ${team1.name}`);

  // 5. Create members and roles
  const m1 = await prisma.workspaceMember.create({
    data: {
      organizationId: org.id,
      workspaceId: ws1.id,
      userId: user.id,
      role: 'OWNER',
    },
  });

  // Create additional mock users & members
  const mockUsers = [
    { email: 'sarah.jenkins@fricta.ai', name: 'Sarah Jenkins', role: 'UX_LEAD' },
    { email: 'alex.rivera@fricta.ai', name: 'Alex Rivera', role: 'INVESTIGATOR' },
    { email: 'dana.chen@fricta.ai', name: 'Dana Chen', role: 'REVIEWER' },
  ];

  const members = [];
  for (const mu of mockUsers) {
    let u = await prisma.user.findUnique({ where: { email: mu.email } });
    if (!u) {
      u = await prisma.user.create({
        data: { email: mu.email, name: mu.name },
      });
    }
    const member = await prisma.workspaceMember.create({
      data: {
        organizationId: org.id,
        workspaceId: ws1.id,
        teamId: team1.id,
        userId: u.id,
        role: mu.role,
      },
    });
    members.push({ user: u, member });
    console.log(`Added workspace member: ${mu.name} as ${mu.role}`);
  }

  // 6. Map existing projects to the Production Analytics Workspace
  const projects = await prisma.project.findMany();
  for (const proj of projects) {
    await prisma.project.update({
      where: { id: proj.id },
      data: { workspaceId: ws1.id },
    });
    console.log(`Scoped existing project "${proj.projectName}" to Workspace: "${ws1.name}"`);
  }

  const activeProject = projects[0];
  if (activeProject) {
    // 7. Seed annotations
    const session = await prisma.workflowSession.findFirst({
      where: { projectId: activeProject.id },
    });

    if (session) {
      const finding = await prisma.uXFinding.findFirst({
        where: { workflowSessionId: session.id },
      });

      // Annotation on Finding
      const ann1 = await prisma.annotation.create({
        data: {
          projectId: activeProject.id,
          targetType: 'FINDING',
          targetId: finding ? finding.id : 'finding-id-placeholder',
          title: 'onboarding-checkout-friction',
          content: 'The hesitation pattern here is critical. Users are taking more than 15s to find the submit CTA.',
          severity: 'HIGH',
          createdById: user.id,
        },
      });

      // Threaded comments on Annotation
      await prisma.evidenceComment.create({
        data: {
          annotationId: ann1.id,
          content: 'Agreed. This aligns with our Power User persona cohort reports.',
          createdById: members[0].user.id, // Sarah Jenkins (UX_LEAD)
        },
      });

      await prisma.evidenceComment.create({
        data: {
          annotationId: ann1.id,
          content: 'I will write a cognitive priority override to assign the FORM_AGENT to investigate this flow.',
          createdById: members[1].user.id, // Alex Rivera (INVESTIGATOR)
        },
      });

      console.log(`Created collaborative annotation with threaded comments`);

      // 8. Seed investigation reviews
      await prisma.investigationReview.create({
        data: {
          workflowSessionId: session.id,
          assignedToId: members[2].user.id, // Dana Chen (REVIEWER)
          status: 'UNDER_REVIEW',
          approvalNotes: 'Pending verification of form input delay metrics.',
        },
      });

      const otherSessions = await prisma.workflowSession.findMany({
        where: { projectId: activeProject.id, NOT: { id: session.id } },
        take: 2,
      });

      for (let idx = 0; idx < otherSessions.length; idx++) {
        await prisma.investigationReview.create({
          data: {
            workflowSessionId: otherSessions[idx].id,
            assignedToId: user.id,
            status: idx === 0 ? 'APPROVED' : 'RESOLVED',
            approvalNotes: idx === 0 ? 'Approved: Onboarding flow stability rating within threshold.' : 'Issue fixed in v2.4 UI hotfix.',
          },
        });
      }
      console.log(`Seeded investigation review states`);
    }

    // 9. Seed SharedLinks
    const link = await prisma.sharedLink.create({
      data: {
        projectId: activeProject.id,
        targetType: 'REPLAY',
        targetId: session ? session.id : 'session-placeholder',
        token: 'share_token_mock_test_123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours expiry
        maxUses: 10,
        createdById: user.id,
      },
    });
    console.log(`Generated secure shared link token: ${link.token}`);

    // 10. Seed ActivityEvents
    const mockLogs = [
      { type: 'INVESTIGATION_RUN', desc: 'Triggered multi-agent adaptive orchestration run' },
      { type: 'ANNOTATION_CREATE', desc: 'Added severity HIGH annotation on form hesitation finding' },
      { type: 'REVIEW_UPDATE', desc: 'Dana Chen marked session review as UNDER_REVIEW' },
      { type: 'PERMISSION_GRANT', desc: 'Sarah Jenkins granted RUN_INVESTIGATION to Alex Rivera' },
      { type: 'REPORT_EXPORT', desc: 'Exported Executive UX Report to PDF' },
    ];

    for (const log of mockLogs) {
      await prisma.activityEvent.create({
        data: {
          projectId: activeProject.id,
          workspaceId: ws1.id,
          userId: user.id,
          actionType: log.type,
          description: log.desc,
        },
      });
    }
    console.log(`Seeded activity logs in the audit feed`);
  }

  console.log('✅ Collaborative Workspace database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
