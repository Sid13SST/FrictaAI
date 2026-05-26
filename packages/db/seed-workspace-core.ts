import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for Workspace Core models...');

  // 1. Get or create a default user
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'workspace-seed-admin@fricta.ai',
        name: 'Workspace Administrator',
      },
    });
    console.log(`Created default admin user: ${user.email}`);
  }

  // Get or create another mock user to invite and interact with
  let coworker = await prisma.user.findUnique({
    where: { email: 'coworker@fricta.ai' },
  });
  if (!coworker) {
    coworker = await prisma.user.create({
      data: {
        email: 'coworker@fricta.ai',
        name: 'Coworker Jane',
      },
    });
    console.log(`Created coworker user: ${coworker.email}`);
  }

  // 2. Get or create organization
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Fricta Enterprise Org',
      },
    });
    console.log(`Created Organization: ${org.name}`);
  }

  // 3. Get or create workspace
  let ws = await prisma.workspace.findFirst({
    where: { organizationId: org.id },
  });
  if (!ws) {
    ws = await prisma.workspace.create({
      data: {
        organizationId: org.id,
        name: 'Main Collaborative Hub',
        description: 'Primary workspace for team-wide UX investigations',
      },
    });
    console.log(`Created Workspace: ${ws.name}`);
  }

  // Ensure user is Owner of workspace
  const isMember = await prisma.workspaceMember.findFirst({
    where: { workspaceId: ws.id, userId: user.id },
  });
  if (!isMember) {
    await prisma.workspaceMember.create({
      data: {
        organizationId: org.id,
        workspaceId: ws.id,
        userId: user.id,
        role: 'OWNER',
      },
    });
  }

  // Ensure coworker is member of workspace
  const isCoworkerMember = await prisma.workspaceMember.findFirst({
    where: { workspaceId: ws.id, userId: coworker.id },
  });
  if (!isCoworkerMember) {
    await prisma.workspaceMember.create({
      data: {
        organizationId: org.id,
        workspaceId: ws.id,
        userId: coworker.id,
        role: 'INVESTIGATOR',
      },
    });
  }

  // 4. Create Workspace Invites
  const pendingToken = crypto.randomBytes(32).toString('hex');
  const acceptedToken = crypto.randomBytes(32).toString('hex');

  await prisma.workspaceInvite.upsert({
    where: { token: pendingToken },
    update: {},
    create: {
      email: 'new.hire@fricta.ai',
      role: 'REVIEWER',
      token: pendingToken,
      workspaceId: ws.id,
      inviterId: user.id,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  await prisma.workspaceInvite.upsert({
    where: { token: acceptedToken },
    update: {},
    create: {
      email: 'coworker@fricta.ai',
      role: 'INVESTIGATOR',
      token: acceptedToken,
      workspaceId: ws.id,
      inviterId: user.id,
      status: 'ACCEPTED',
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // expired/accepted
    },
  });
  console.log('Seeded mock workspace invitations');

  // 5. Link projects to workspace
  let project = await prisma.project.findFirst();
  if (!project) {
    project = await prisma.project.create({
      data: {
        userId: user.id,
        projectName: 'Workspace Core Live Dashboard',
        websiteUrl: 'https://dashboard.fricta.ai',
        workspaceId: ws.id,
      },
    });
    console.log(`Created Project: ${project.projectName}`);
  } else {
    // scope to workspace
    await prisma.project.update({
      where: { id: project.id },
      data: { workspaceId: ws.id },
    });
  }

  await prisma.workspaceProject.create({
    data: {
      workspaceId: ws.id,
      projectId: project.id,
    },
  });
  console.log(`Linked Project "${project.projectName}" via WorkspaceProject relation`);

  // 6. Share investigations (Workflow sessions)
  let session = await prisma.workflowSession.findFirst({
    where: { projectId: project.id },
  });

  if (!session) {
    session = await prisma.workflowSession.create({
      data: {
        projectId: project.id,
        goal: 'Validate workspace authentication dashboard',
        persona: 'Power User',
        status: 'COMPLETED',
        stepCount: 12,
      },
    });
    console.log('Created mock WorkflowSession for sharing');
  }

  const sharedInv = await prisma.sharedInvestigation.create({
    data: {
      workspaceId: ws.id,
      workflowSessionId: session.id,
      name: 'Authentication Pipeline Hesitation Investigation',
      description: 'Reviewing cognitive load levels during workspace invitation acceptee verification',
      createdById: user.id,
    },
  });

  // Seed Investigation comments
  await prisma.investigationComment.create({
    data: {
      sharedInvestigationId: sharedInv.id,
      userId: coworker.id,
      content: 'I noticed a 1500ms delay during token decryption in the backend API. We should check if database transactions are blocking.',
    },
  });

  await prisma.investigationComment.create({
    data: {
      sharedInvestigationId: sharedInv.id,
      userId: user.id,
      content: 'Good catch. Added a database index mapping the invite token table to prevent full-table scans.',
    },
  });
  console.log(`Seeded shared investigation "${sharedInv.name}" with threaded comments`);

  // 7. Seed activities
  const activities = [
    { type: 'INVITE_SENT', desc: 'Administrator sent invite to new.hire@fricta.ai as REVIEWER' },
    { type: 'MEMBER_JOINED', desc: 'Coworker Jane joined the workspace as INVESTIGATOR' },
    { type: 'PROJECT_ADDED', desc: `Project "${project.projectName}" was linked to workspace` },
    { type: 'INVESTIGATION_SHARED', desc: `Administrator shared investigation "${sharedInv.name}"` },
  ];

  for (const act of activities) {
    await prisma.workspaceActivity.create({
      data: {
        workspaceId: ws.id,
        userId: user.id,
        actionType: act.type,
        description: act.desc,
      },
    });
  }
  console.log('Seeded workspace audit activities');

  console.log('✅ Seeding of Workspace Core models complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
