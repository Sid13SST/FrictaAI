import { prisma } from '@fricta/db';
import {
  verifyProjectOwnership,
  verifyWorkflowOwnership,
  verifyReportOwnership,
  verifyInvestigationOwnership,
  verifyAlertOwnership
} from '../guards/ownership';
import { memoryProjects, memorySessions } from '../utils/memoryDb';

interface TestResult {
  resourceType: string;
  scenario: string;
  expected: string;
  actual: string;
  passed: boolean;
}

const results: TestResult[] = [];

function recordResult(resourceType: string, scenario: string, expected: string, actual: string) {
  results.push({
    resourceType,
    scenario,
    expected,
    actual,
    passed: expected === actual
  });
}

async function runTests() {
  console.log('\n🔒 Fricta Backend Ownership Authorization Test Suite\n');

  // 1. Seed database with test users & resources
  const ownerId = 'user-test-owner';
  const nonOwnerId = 'user-test-non-owner';
  
  const projectId = 'project-test-auth';
  const nonOwnerProjectId = 'project-test-auth-non-owner';

  const sessionId = 'session-test-auth';
  const reportId = 'report-test-auth';
  const threadId = 'thread-test-auth';
  const alertId = 'alert-test-auth';

  console.log('🌱 Seeding database with test authorization records...');
  
  try {
    // Upsert owners
    await prisma.user.upsert({
      where: { id: ownerId },
      update: {},
      create: { id: ownerId, email: 'owner@fricta.ai', name: 'Owner User' }
    });

    await prisma.user.upsert({
      where: { id: nonOwnerId },
      update: {},
      create: { id: nonOwnerId, email: 'nonowner@fricta.ai', name: 'Non-Owner User' }
    });

    // Upsert projects
    await prisma.project.upsert({
      where: { id: projectId },
      update: { userId: ownerId },
      create: { id: projectId, projectName: 'Auth Test Project', websiteUrl: 'https://test-auth.fricta.ai', userId: ownerId }
    });

    await prisma.project.upsert({
      where: { id: nonOwnerProjectId },
      update: { userId: nonOwnerId },
      create: { id: nonOwnerProjectId, projectName: 'Non-Owner Test Project', websiteUrl: 'https://test-non-owner.fricta.ai', userId: nonOwnerId }
    });

    // Upsert workflow session
    await prisma.workflowSession.upsert({
      where: { id: sessionId },
      update: { projectId },
      create: { id: sessionId, projectId, status: 'COMPLETED' }
    });

    // Upsert executive report
    await prisma.executiveReport.upsert({
      where: { id: reportId },
      update: { projectId, createdById: ownerId },
      create: {
        id: reportId,
        projectId,
        createdById: ownerId,
        title: 'Auth Test Report',
        summary: 'Test summary content',
        stabilityScore: 92.5,
        completionRate: 85.0,
        riskLevel: 'LOW',
        sections: {}
      }
    });

    // Upsert investigation thread
    await prisma.investigationThread.upsert({
      where: { id: threadId },
      update: { projectId, workflowSessionId: sessionId },
      create: {
        id: threadId,
        projectId,
        workflowSessionId: sessionId,
        title: 'Auth Test Investigation Thread',
        status: 'ACTIVE'
      }
    });

    // Upsert operational alert
    await prisma.operationalAlert.upsert({
      where: { id: alertId },
      update: { projectId, workflowSessionId: sessionId },
      create: {
        id: alertId,
        projectId,
        workflowSessionId: sessionId,
        alertType: 'REGRESSION',
        severity: 'HIGH',
        message: 'Auth Test Alert Message',
        resolved: false
      }
    });

    console.log('✅ Test seeding completed successfully.\n');
  } catch (error) {
    console.error('❌ Failed to seed test database:', error);
    process.exit(1);
  }

  // 2. Execute ownership tests
  console.log('🧪 Running ownership traversal checks...\n');

  // --- PROJECT OWNERSHIP TESTS ---
  recordResult(
    'Project',
    'Owner Access',
    'OWNED',
    await verifyProjectOwnership(ownerId, projectId)
  );
  recordResult(
    'Project',
    'Non-Owner Access',
    'NOT_OWNED',
    await verifyProjectOwnership(nonOwnerId, projectId)
  );
  recordResult(
    'Project',
    'Invalid Project ID',
    'NOT_FOUND',
    await verifyProjectOwnership(ownerId, 'invalid-project-id')
  );

  // --- WORKFLOW OWNERSHIP TESTS ---
  recordResult(
    'WorkflowSession',
    'Owner Access',
    'OWNED',
    await verifyWorkflowOwnership(ownerId, sessionId)
  );
  recordResult(
    'WorkflowSession',
    'Non-Owner Access',
    'NOT_OWNED',
    await verifyWorkflowOwnership(nonOwnerId, sessionId)
  );
  recordResult(
    'WorkflowSession',
    'Invalid Session ID',
    'NOT_FOUND',
    await verifyWorkflowOwnership(ownerId, 'invalid-session-id')
  );

  // --- REPORT OWNERSHIP TESTS ---
  recordResult(
    'ExecutiveReport',
    'Owner Access',
    'OWNED',
    await verifyReportOwnership(ownerId, reportId)
  );
  recordResult(
    'ExecutiveReport',
    'Non-Owner Access',
    'NOT_OWNED',
    await verifyReportOwnership(nonOwnerId, reportId)
  );
  recordResult(
    'ExecutiveReport',
    'Invalid Report ID',
    'NOT_FOUND',
    await verifyReportOwnership(ownerId, 'invalid-report-id')
  );

  // --- INVESTIGATION OWNERSHIP TESTS ---
  recordResult(
    'InvestigationThread',
    'Owner Access',
    'OWNED',
    await verifyInvestigationOwnership(ownerId, threadId)
  );
  recordResult(
    'InvestigationThread',
    'Non-Owner Access',
    'NOT_OWNED',
    await verifyInvestigationOwnership(nonOwnerId, threadId)
  );
  recordResult(
    'InvestigationThread',
    'Invalid Thread ID',
    'NOT_FOUND',
    await verifyInvestigationOwnership(ownerId, 'invalid-thread-id')
  );

  // --- ALERT OWNERSHIP TESTS ---
  recordResult(
    'OperationalAlert',
    'Owner Access',
    'OWNED',
    await verifyAlertOwnership(ownerId, alertId)
  );
  recordResult(
    'OperationalAlert',
    'Non-Owner Access',
    'NOT_OWNED',
    await verifyAlertOwnership(nonOwnerId, alertId)
  );
  recordResult(
    'OperationalAlert',
    'Invalid Alert ID',
    'NOT_FOUND',
    await verifyAlertOwnership(ownerId, 'invalid-alert-id')
  );

  // --- IN-MEMORY RESOURCES FALLBACK TESTS ---
  console.log('🧪 Running in-memory fallback checks...');
  
  const memSessionId = 'session-mem-test';
  
  // Set up in-memory session mapping to database project ID
  memorySessions.set(memSessionId, {
    id: memSessionId,
    projectId: projectId,
    status: 'RUNNING'
  });

  recordResult(
    'MemorySession (DB Project)',
    'Owner Access',
    'OWNED',
    await verifyWorkflowOwnership(ownerId, memSessionId)
  );
  recordResult(
    'MemorySession (DB Project)',
    'Non-Owner Access',
    'NOT_OWNED',
    await verifyWorkflowOwnership(nonOwnerId, memSessionId)
  );

  // Set up in-memory session with non-existent project
  const memSessionBadProject = 'session-mem-bad';
  memorySessions.set(memSessionBadProject, {
    id: memSessionBadProject,
    projectId: 'non-existent-project-id'
  });

  recordResult(
    'MemorySession (Bad Project)',
    'Access Attempt',
    'NOT_FOUND',
    await verifyWorkflowOwnership(ownerId, memSessionBadProject)
  );

  // Test default-mem-project-id fallback
  recordResult(
    'Project (Default Memory Project)',
    'Access Attempt',
    'OWNED',
    await verifyProjectOwnership(ownerId, 'default-mem-project-id')
  );

  // 3. Print test results
  console.log('\n📊 Results\n');
  console.log(
    '  ' +
    'Resource Type'.padEnd(25) +
    'Scenario'.padEnd(30) +
    'Expected'.padEnd(12) +
    'Actual'.padEnd(12) +
    'Status'
  );
  console.log('  ' + '─'.repeat(85));

  let passed = 0;
  let failed = 0;

  for (const r of results) {
    const statusText = r.passed ? '✅ PASS' : '❌ FAIL';
    if (r.passed) passed++;
    else failed++;

    console.log(
      '  ' +
      r.resourceType.padEnd(25) +
      r.scenario.padEnd(30) +
      r.expected.padEnd(12) +
      r.actual.padEnd(12) +
      statusText
    );
  }

  console.log('\n  ' + '─'.repeat(85));
  console.log(`  Total: ${results.length} | Passed: ${passed} | Failed: ${failed}\n`);

  // Cleanup seeded test records
  console.log('🧹 Cleaning up test database records...');
  try {
    await prisma.operationalAlert.delete({ where: { id: alertId } }).catch(() => {});
    await prisma.investigationThread.delete({ where: { id: threadId } }).catch(() => {});
    await prisma.executiveReport.delete({ where: { id: reportId } }).catch(() => {});
    await prisma.workflowSession.delete({ where: { id: sessionId } }).catch(() => {});
    await prisma.project.delete({ where: { id: projectId } }).catch(() => {});
    await prisma.project.delete({ where: { id: nonOwnerProjectId } }).catch(() => {});
    await prisma.user.delete({ where: { id: ownerId } }).catch(() => {});
    await prisma.user.delete({ where: { id: nonOwnerId } }).catch(() => {});
    console.log('✅ Cleanup completed successfully.');
  } catch (err) {
    console.error('⚠️ Cleanup had some errors:', err);
  }

  if (failed > 0) {
    console.log('\n  ❌ SOME TESTS FAILED\n');
    process.exit(1);
  } else {
    console.log('\n  ✅ ALL TESTS PASSED\n');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test runner exception:', err);
  process.exit(1);
});
