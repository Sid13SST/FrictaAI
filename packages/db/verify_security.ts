import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('🔍 Starting database queries for Security, Audit, and Compliance verification...');

  // 1. AuditEvent
  const auditEvents = await prisma.auditEvent.findMany();
  console.log(`\n📋 Audit Events Count: ${auditEvents.length}`);
  for (const e of auditEvents) {
    console.log(`- Action: "${e.action}" | Resource: "${e.resource}"`);
    console.log(`  Description: ${e.description}`);
    console.log(`  Metadata:`, JSON.stringify(e.metadata));
  }

  // 2. SecurityEvent
  const securityEvents = await prisma.securityEvent.findMany();
  console.log(`\n🔒 Security Events Count: ${securityEvents.length}`);
  for (const e of securityEvents) {
    console.log(`- Type: "${e.eventType}" | Severity: "${e.severity}"`);
    console.log(`  Description: ${e.description}`);
    console.log(`  Metadata:`, JSON.stringify(e.metadata));
  }

  // 3. ReplayAuditLog
  const replayLogs = await prisma.replayAuditLog.findMany();
  console.log(`\n🎥 Replay Audit Logs Count: ${replayLogs.length}`);
  for (const l of replayLogs) {
    console.log(`- Action: "${l.action}" | Session: "${l.workflowSessionId}"`);
    console.log(`  Description: ${l.description}`);
    console.log(`  Metadata:`, JSON.stringify(l.metadata));
  }

  // 4. InvestigationAuditLog
  const invLogs = await prisma.investigationAuditLog.findMany();
  console.log(`\n🔎 Investigation Audit Logs Count: ${invLogs.length}`);
  for (const l of invLogs) {
    console.log(`- Action: "${l.action}" | Shared Investigation: "${l.sharedInvestigationId}"`);
    console.log(`  Description: ${l.description}`);
  }

  // 5. GovernancePolicyEvent
  const policyEvents = await prisma.governancePolicyEvent.findMany();
  console.log(`\n⚖️ Governance Policy Events Count: ${policyEvents.length}`);
  for (const e of policyEvents) {
    console.log(`- Key: "${e.policyKey}" | Old: "${e.oldValue}" -> New: "${e.newValue}"`);
    console.log(`  Description: ${e.description}`);
  }

  // 6. ComplianceRetentionRecord
  const retentionRecords = await prisma.complianceRetentionRecord.findMany();
  console.log(`\n📦 Compliance Retention Records Count: ${retentionRecords.length}`);
  for (const r of retentionRecords) {
    console.log(`- Resource: "${r.resourceType}" (ID: ${r.resourceId}) | Days: ${r.retentionDays}`);
    console.log(`  Status: ${r.status} | Expires At: ${r.expiresAt}`);
  }

  // 7. AccessTraceRecord
  const traceRecords = await prisma.accessTraceRecord.findMany();
  console.log(`\n🚀 Access Trace Records Count: ${traceRecords.length}`);
  for (const r of traceRecords) {
    console.log(`- Resource: "${r.resourceType}" (ID: ${r.resourceId})`);
    console.log(`  IP: ${r.ipAddress} | User-Agent: ${r.userAgent}`);
  }

  // 8. WorkspaceSecurityAlert
  const securityAlerts = await prisma.workspaceSecurityAlert.findMany();
  console.log(`\n🚨 Workspace Security Alerts Count: ${securityAlerts.length}`);
  for (const a of securityAlerts) {
    console.log(`- Type: "${a.alertType}" | Severity: "${a.severity}" | Resolved: ${a.resolved}`);
    console.log(`  Description: ${a.description}`);
  }

  console.log('\n✅ Security verification queries completed successfully!');
}

verify()
  .catch((e) => {
    console.error('❌ Verification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
