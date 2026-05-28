import { prisma } from './src';
import { AutonomousOptimizationEngine, RollbackController } from '../autonomous-optimization/src';

async function seed() {
  console.log('--- Starting Autonomous Optimization Seeding ---');

  // 1. Ensure a user exists
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'founder@fricta.ai',
        name: 'Fricta Founder'
      }
    });
    console.log('Created default user:', user.email);
  }

  // 2. Ensure a project exists
  let project = await prisma.project.findFirst({
    where: { userId: user.id }
  });
  if (!project) {
    project = await prisma.project.create({
      data: {
        userId: user.id,
        projectName: 'Fricta Core App',
        websiteUrl: 'https://fricta.ai'
      }
    });
    console.log('Created default project:', project.projectName);
  }

  // 3. Propose autonomous runs
  console.log('Creating autonomous optimization proposal...');
  const proposal = await AutonomousOptimizationEngine.createProposalRun(
    project.id,
    null,
    '/checkout',
    'Consolidate cart inputs and contrast checkout trigger button.',
    'button#submit-checkout'
  );

  console.log(`Created proposal run: ${proposal.id} (Safety Score: ${proposal.overallSafetyScore}%)`);

  // 4. Submit approval
  console.log('Submitting human-in-the-loop approval...');
  const approvedRun = await AutonomousOptimizationEngine.submitReviewStatus(
    proposal.id!,
    user.id,
    'UX_LEAD',
    'APPROVED',
    'Remediation matches clarity benchmarks. Deploying sandbox configuration.'
  );
  console.log(`Approval submitted. New status: ${approvedRun.status}`);

  // 5. Test rollback control
  console.log('Executing reversible rollback operation...');
  const rolledBackRun = await RollbackController.executeRollback(
    proposal.id!,
    user.id,
    'Reverting checkout design change due to minor visual alignment shift.'
  );
  console.log(`Rollback completed. Status: ${rolledBackRun.status}`);

  // 6. Verify and query database entries
  console.log('Verifying records in database...');
  const runsCount = await prisma.autonomousOptimizationRun.count({
    where: { projectId: project.id }
  });
  const simulationsCount = await prisma.optimizationSimulation.count({
    where: { optimizationRun: { projectId: project.id } }
  });
  const approvalsCount = await prisma.optimizationApproval.count({
    where: { optimizationRun: { projectId: project.id } }
  });
  const rollbacksCount = await prisma.optimizationRollback.count({
    where: { optimizationRun: { projectId: project.id } }
  });
  const governanceEventsCount = await prisma.optimizationGovernanceEvent.count();

  console.log(`Verification Metrics:`);
  console.log(`- Optimization Runs: ${runsCount}`);
  console.log(`- Simulations Logged: ${simulationsCount}`);
  console.log(`- Reviews / Approvals: ${approvalsCount}`);
  console.log(`- Rollbacks Executed: ${rollbacksCount}`);
  console.log(`- Governance Audits: ${governanceEventsCount}`);

  console.log('--- Autonomous Optimization Seeding & Verification Complete ---');
}

seed()
  .catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
