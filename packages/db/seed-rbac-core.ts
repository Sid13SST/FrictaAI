import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for RBAC and Permissions models...');

  // 1. Fetch default user & workspace
  const user = await prisma.user.findFirst();
  const workspace = await prisma.workspace.findFirst();

  if (!user || !workspace) {
    console.error('❌ User or Workspace not found. Please run seed-workspace-core first.');
    process.exit(1);
  }

  // 2. Seed custom roles
  const customRole = await prisma.workspaceRole.create({
    data: {
      workspaceId: workspace.id,
      name: 'UX_LEAD_SPECIALIST',
      description: 'Custom specialist role with expanded swarm permission visibility',
      permissions: {
        create: [
          { domain: 'SWARM', action: 'EXECUTE', isAllowed: true },
          { domain: 'ANALYTICS', action: 'READ', isAllowed: true },
          { domain: 'INVESTIGATION', action: 'WRITE', isAllowed: true },
        ],
      },
    },
  });
  console.log(`Seeded custom role: ${customRole.name}`);

  // Update coworker member to have this custom role if member exists
  const coworker = await prisma.user.findUnique({
    where: { email: 'coworker@fricta.ai' },
  });
  if (coworker) {
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: workspace.id, userId: coworker.id },
    });
    if (member) {
      await prisma.workspaceMember.update({
        where: { id: member.id },
        data: {
          role: 'UX_LEAD_SPECIALIST',
          workspaceRoleId: customRole.id,
        },
      });
      console.log(`Assigned coworker "${coworker.name}" to custom role "${customRole.name}"`);
    }
  }

  // 3. Seed Workspace Policies
  const policies = [
    { key: 'inviteRestrictions', value: 'ADMIN_ONLY' },
    { key: 'externalSharing', value: 'ENABLED' },
    { key: 'guestAccess', value: 'ENABLED' },
    { key: 'replaySharing', value: 'WORKSPACE' },
    { key: 'exportRestrictions', value: 'ENABLED' },
    { key: 'workspaceVisibility', value: 'PRIVATE' },
  ];

  for (const policy of policies) {
    await prisma.workspacePolicy.upsert({
      where: {
        id: `${workspace.id}-${policy.key}`, // we can use workspace-key to mock unique, or just create them
      },
      update: { value: policy.value },
      create: {
        workspaceId: workspace.id,
        key: policy.key,
        value: policy.value,
      },
    });
  }
  console.log('Seeded workspace governance policies');

  // 4. Seed Replay access scopes
  const session = await prisma.workflowSession.findFirst();
  if (session) {
    await prisma.replayAccessScope.create({
      data: {
        workspaceId: workspace.id,
        workflowSessionId: session.id,
        scopeType: 'WORKSPACE',
        allowedRoles: ['OWNER', 'ADMIN', 'ANALYST', 'UX_LEAD_SPECIALIST'],
      },
    });
    console.log(`Seeded ReplayAccessScope for WorkflowSession ${session.id}`);
  }

  // 5. Seed Shared Access Grants
  const sharedInv = await prisma.sharedInvestigation.findFirst();
  if (sharedInv) {
    await prisma.sharedAccessGrant.create({
      data: {
        workspaceId: workspace.id,
        resourceType: 'INVESTIGATION',
        resourceId: sharedInv.id,
        granteeEmail: 'external.consultant@fricta.ai',
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days expiry
      },
    });
    console.log(`Seeded external SharedAccessGrant for investigation: "${sharedInv.name}"`);
  }

  // 6. Seed Workspace Security Events
  const securityLogs = [
    { type: 'POLICY_UPDATE', severity: 'WARNING', desc: 'Workspace policy "externalSharing" updated from DISABLED to ENABLED by Owner' },
    { type: 'ROLE_CHANGE', severity: 'INFO', desc: 'Created custom role UX_LEAD_SPECIALIST' },
    { type: 'ROLE_CHANGE', severity: 'INFO', desc: 'Assigned Coworker Jane to role UX_LEAD_SPECIALIST' },
    { type: 'EXTERNAL_SHARE', severity: 'WARNING', desc: 'Investigation shared externally with consultant external.consultant@fricta.ai' },
  ];

  for (const log of securityLogs) {
    await prisma.workspaceSecurityEvent.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        eventType: log.type,
        severity: log.severity,
        description: log.desc,
      },
    });
  }
  console.log('Seeded security audit logs timeline');

  console.log('✅ RBAC and Permissions database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
