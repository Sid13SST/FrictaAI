import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for Security Core and Audit models...');

  // 1. Fetch default user, workspace, and project
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

  const session = project.sessions[0];
  const session2 = project.sessions[1] || session;
  const sharedInv = await prisma.sharedInvestigation.findFirst();

  // 2. Seed AuditEvent entries
  await prisma.auditEvent.createMany({
    data: [
      {
        workspaceId: workspace.id,
        userId: user.id,
        action: 'MEMBER_INVITE_SEND',
        resource: 'WorkspaceInvite',
        description: 'Sent workspace invite to compliance-auditor@fricta.ai with Lead role.',
        metadata: { role: 'ADMIN', invitedEmail: 'compliance-auditor@fricta.ai' }
      },
      {
        workspaceId: workspace.id,
        userId: user.id,
        action: 'WORKSPACE_POLICY_UPDATE',
        resource: 'WorkspacePolicy',
        description: 'Updated externalSharing policy from ENABLED to ADMIN_ONLY.',
        metadata: { policyKey: 'externalSharing', oldValue: 'ENABLED', newValue: 'ADMIN_ONLY' }
      },
      {
        workspaceId: workspace.id,
        userId: user.id,
        action: 'ROLE_PERMISSION_OVERRIDE',
        resource: 'WorkspacePermission',
        description: 'Created custom access grant for VIEWER to read project analytics reports.',
        metadata: { roleName: 'VIEWER', domain: 'ANALYTICS', action: 'READ' }
      }
    ]
  });
  console.log('Seeded 3 general audit events.');

  // 3. Seed SecurityEvent entries
  await prisma.securityEvent.createMany({
    data: [
      {
        workspaceId: workspace.id,
        userId: user.id,
        eventType: 'SUSPICIOUS_ACCESS',
        severity: 'WARNING',
        description: 'Access request initiated utilizing command-line automated developer client: curl/8.4.0',
        metadata: { ipAddress: '198.51.100.42', userAgent: 'curl/8.4.0' }
      },
      {
        workspaceId: workspace.id,
        userId: user.id,
        eventType: 'CROSS_WORKSPACE_VIOLATION',
        severity: 'CRITICAL',
        description: 'Unauthorized crossover resource load attempt. Blocked token mapped to external tenant scope.',
        metadata: { activeWorkspaceId: workspace.id, targetWorkspaceId: 'ext-workspace-id-998' }
      },
      {
        workspaceId: workspace.id,
        userId: user.id,
        eventType: 'UNAUTHORIZED_ATTEMPT',
        severity: 'WARNING',
        description: 'Read access rejected for sensitive visual session recording. Insufficient workspace membership.',
        metadata: { requiredRole: 'ADMIN', activeRole: 'VIEWER' }
      }
    ]
  });
  console.log('Seeded 3 security events.');

  // 4. Seed ReplayAuditLog entries
  if (session) {
    await prisma.replayAuditLog.createMany({
      data: [
        {
          workspaceId: workspace.id,
          workflowSessionId: session.id,
          userId: user.id,
          action: 'ACCESS',
          description: 'Accessed full visual replay and mouse trails coordinates dashboard.',
          metadata: { ipAddress: '192.168.1.101', userAgent: 'Mozilla/5.0 Chrome/124.0.0' }
        },
        {
          workspaceId: workspace.id,
          workflowSessionId: session.id,
          userId: user.id,
          action: 'EXPORT',
          description: 'Exported session recording timeline metadata to JSON.',
          metadata: { exportFormat: 'JSON', byteSize: 24102 }
        }
      ]
    });
    console.log(`Seeded 2 ReplayAuditLogs on session ${session.id}.`);
  }

  // 5. Seed InvestigationAuditLog entries
  if (sharedInv) {
    await prisma.investigationAuditLog.createMany({
      data: [
        {
          workspaceId: workspace.id,
          sharedInvestigationId: sharedInv.id,
          userId: user.id,
          action: 'COMMENT',
          description: 'Added detailed annotation critique to the shared checklist page.',
          metadata: { commentTextLength: 145 }
        },
        {
          workspaceId: workspace.id,
          sharedInvestigationId: sharedInv.id,
          userId: user.id,
          action: 'PERMISSION_CHANGE',
          description: 'Updated investigation access bounds to read-only for public guests.',
          metadata: { accessorType: 'PUBLIC', canWrite: false }
        }
      ]
    });
    console.log(`Seeded 2 InvestigationAuditLogs on SharedInvestigation ${sharedInv.id}.`);
  }

  // 6. Seed GovernancePolicyEvent entries
  await prisma.governancePolicyEvent.createMany({
    data: [
      {
        workspaceId: workspace.id,
        userId: user.id,
        policyKey: 'externalSharing',
        oldValue: 'ENABLED',
        newValue: 'ADMIN_ONLY',
        description: 'Restricted external report compilation sharing keys to workspace administrators.'
      },
      {
        workspaceId: workspace.id,
        userId: user.id,
        policyKey: 'inviteRestrictions',
        oldValue: 'DISABLED',
        newValue: 'ENABLED',
        description: 'Required owner authorizations for all incoming guest or team invitations.'
      }
    ]
  });
  console.log('Seeded 2 GovernancePolicyEvents.');

  // 7. Seed ComplianceRetentionRecord entries
  if (session && session2) {
    const expiresSession = new Date();
    expiresSession.setDate(expiresSession.getDate() + 90);
    const expiresReport = new Date();
    expiresReport.setDate(expiresReport.getDate() + 180);

    await prisma.complianceRetentionRecord.createMany({
      data: [
        {
          workspaceId: workspace.id,
          resourceType: 'REPLAY',
          resourceId: session.id,
          retentionDays: 90,
          expiresAt: expiresSession,
          status: 'ACTIVE',
          notes: 'Standard 90-day retention loop for compliance raw recordings.'
        },
        {
          workspaceId: workspace.id,
          resourceType: 'REPORT',
          resourceId: session2.id,
          retentionDays: 180,
          expiresAt: expiresReport,
          status: 'ACTIVE',
          notes: 'Archival report files saved for SOC2 alignment audits.'
        }
      ]
    });
    console.log('Seeded 2 compliance retention records.');
  }

  // 8. Seed AccessTraceRecord entries
  if (session) {
    await prisma.accessTraceRecord.createMany({
      data: [
        {
          workspaceId: workspace.id,
          userId: user.id,
          resourceType: 'REPLAY',
          resourceId: session.id,
          ipAddress: '198.51.100.82',
          userAgent: 'Mozilla/5.0 macOS/Safari'
        },
        {
          workspaceId: workspace.id,
          userId: user.id,
          resourceType: 'REPORT',
          resourceId: session.id,
          ipAddress: '198.51.100.82',
          userAgent: 'Mozilla/5.0 macOS/Safari'
        }
      ]
    });
    console.log('Seeded 2 access trace records.');
  }

  // 9. Seed WorkspaceSecurityAlert entries
  await prisma.workspaceSecurityAlert.createMany({
    data: [
      {
        workspaceId: workspace.id,
        userId: user.id,
        alertType: 'SUSPICIOUS_ACCESS',
        severity: 'WARNING',
        description: 'Automated command-line API requests originated from unusual external developer client.',
        resolved: false,
        metadata: { detectedClient: 'curl', ip: '198.51.100.42' }
      },
      {
        workspaceId: workspace.id,
        userId: user.id,
        alertType: 'CROSS_WORKSPACE_VIOLATION',
        severity: 'CRITICAL',
        description: 'Resource load attempted spanning cross-workspace borders. Flagged and locked session query.',
        resolved: true,
        resolvedById: user.id,
        resolvedAt: new Date(),
        metadata: { tenantCrossed: 'ext-workspace-998' }
      }
    ]
  });
  console.log('Seeded 2 security alerts.');

  console.log('✅ Security Core database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
