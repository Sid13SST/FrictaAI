import { prisma } from '@fricta/db';
import { OrchestratorCoordinator } from './core';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function runTest() {
  console.log('--- Starting Multi-Agent Orchestration Dry-Run ---');

  // Find a workflow session or create a dummy one
  let session = await prisma.workflowSession.findFirst({
    orderBy: { startedAt: 'desc' }
  });

  if (!session) {
    console.log('No WorkflowSession found in database. Creating a test mock session...');
    
    // Find or create a project first since WorkflowSession requires projectId
    let project = await prisma.project.findFirst();
    if (!project) {
      let user = await prisma.user.findFirst();
      if (!user) {
        user = await prisma.user.create({
          data: {
            id: 'test-user-id',
            email: 'test@fricta.ai',
            name: 'Test Orchestrator User'
          }
        });
      }
      project = await prisma.project.create({
        data: {
          id: 'test-project-id',
          userId: user.id,
          projectName: 'Test Project',
          websiteUrl: 'https://example.com'
        }
      });
    }

    session = await prisma.workflowSession.create({
      data: {
        id: 'test-orchestrator-session-id',
        projectId: project.id,
        goal: 'Validate multi-agent orchestration grid and retry mechanics',
        persona: 'BEGINNER',
        startedAt: new Date(),
        endedAt: new Date(),
        stepCount: 1
      }
    });

    // Create a dummy screenshot and action so visual-intelligence analysis runs without crashing
    await prisma.workflowScreenshot.create({
      data: {
        workflowSessionId: session.id,
        screenshotType: 'step',
        fileSize: 1024,
        stepIndex: 0,
        filePath: '/mock/screenshot.png',
        thumbnailPath: '/mock/screenshot_thumb.png',
        pageUrl: 'https://example.com/onboarding',
        viewportWidth: 1280,
        viewportHeight: 720
      }
    });

    await prisma.agentAction.create({
      data: {
        workflowSessionId: session.id,
        action: 'click',
        target: 'button#start',
        stepNumber: 0,
        status: 'SUCCESS'
      }
    });
  }

  console.log(`Targeting Workflow Session: ${session.id} ("${session.goal}")`);

  const coordinator = new OrchestratorCoordinator(prisma);
  
  try {
    const orchestrationSessionId = await coordinator.runOrchestration(session.id);
    console.log(`Orchestration completed successfully! Session ID: ${orchestrationSessionId}`);

    // Verify session
    const dbSession = await prisma.orchestrationSession.findUnique({
      where: { id: orchestrationSessionId },
      include: {
        agentExecutions: true,
        sharedContextEvents: true,
        delegationEvents: true
      }
    });

    if (!dbSession) {
      throw new Error(`Orchestration session ${orchestrationSessionId} not found in database`);
    }

    console.log('\n--- Database Execution Summary ---');
    console.log(`Status: ${dbSession.status}`);
    console.log(`Total Agent Executions: ${dbSession.agentExecutions.length}`);
    dbSession.agentExecutions.forEach((a) => {
      console.log(` - Agent: ${a.agentType} | Status: ${a.status} | Task: "${a.task.slice(0, 40)}..."`);
    });

    console.log(`\nTotal Shared Context Events: ${dbSession.sharedContextEvents.length}`);
    dbSession.sharedContextEvents.forEach((e) => {
      console.log(` - Event: ${e.eventType}`);
    });

    console.log(`\nTotal Delegation Message Logs: ${dbSession.delegationEvents.length}`);
    dbSession.delegationEvents.forEach((d) => {
      console.log(` - Message: ${d.fromAgent} -> ${d.toAgent} [${d.eventType}]`);
    });

  } catch (err: any) {
    console.error('Orchestration run failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
  process.exit(0);
}

runTest();
