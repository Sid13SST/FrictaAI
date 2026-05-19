import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Fricta database with a mock UX session...');

  // 1. Create a dummy user
  const user = await prisma.user.upsert({
    where: { email: 'test@fricta.ai' },
    update: {},
    create: {
      email: 'test@fricta.ai',
      name: 'UX Tester',
    },
  });

  // 2. Create a dummy project
  const project = await prisma.project.create({
    data: {
      userId: user.id,
      projectName: 'Fricta Demo App',
      websiteUrl: 'https://demo.fricta.ai',
    },
  });

  // 3. Create a workflow session
  const session = await prisma.workflowSession.create({
    data: {
      projectId: project.id,
      goal: 'Sign up and create a new project',
      persona: 'Non-technical founder',
      status: 'COMPLETED',
      stepCount: 15,
      startedAt: new Date(Date.now() - 5 * 60000), // 5 minutes ago
      endedAt: new Date(),
    },
  });

  const sessionId = session.id;

  // 4. Create Agent Thoughts
  const thoughts = [
    { thought: "Navigating to homepage to find sign up button", stepNumber: 1, delayMs: 0 },
    { thought: "Looking for sign up CTA...", stepNumber: 2, delayMs: 2000 },
    { thought: "Found CTA, clicking it", stepNumber: 3, delayMs: 25000 }, // 25s delay -> HESITATION
    { thought: "Filling out the form", stepNumber: 4, delayMs: 2000 },
    { thought: "Error on form, retrying", stepNumber: 5, delayMs: 3000 },
    { thought: "Error again", stepNumber: 6, delayMs: 2000 },
    { thought: "Finally submitted", stepNumber: 7, delayMs: 2000 },
  ];

  let currentTimestamp = session.startedAt!.getTime();

  for (const t of thoughts) {
    currentTimestamp += t.delayMs;
    await prisma.agentThought.create({
      data: {
        workflowSessionId: sessionId,
        thought: t.thought,
        stepNumber: t.stepNumber,
        timestamp: new Date(currentTimestamp),
      }
    });
  }

  // 5. Create Agent Actions
  currentTimestamp = session.startedAt!.getTime();
  const actions = [
    { action: "navigate", target: "https://demo.fricta.ai", status: "success", stepNumber: 1, delayMs: 1000 },
    { action: "click", target: "#sign-up-button", status: "success", stepNumber: 3, delayMs: 26000 }, // Trigger HESITATION
    { action: "type", target: "#email-input", value: "test@example.com", status: "failed", stepNumber: 4, delayMs: 5000 },
    { action: "type", target: "#email-input", value: "test@example.com", status: "failed", stepNumber: 5, delayMs: 3000 }, // Trigger REPEATED_ACTION / FORM_USABILITY
    { action: "type", target: "#email-input", value: "test@example.com", status: "success", stepNumber: 6, delayMs: 2000 },
    { action: "click", target: "#submit-btn", status: "success", stepNumber: 7, delayMs: 2000 },
  ];

  for (const a of actions) {
    currentTimestamp += a.delayMs;
    await prisma.agentAction.create({
      data: {
        workflowSessionId: sessionId,
        action: a.action,
        target: a.target,
        value: a.value,
        status: a.status,
        stepNumber: a.stepNumber,
        timestamp: new Date(currentTimestamp),
      }
    });
  }

  // 6. Create Interaction Events
  currentTimestamp = session.startedAt!.getTime();
  const interactions = [
    { type: "scroll", target: "window", delayMs: 5000 },
    { type: "scroll", target: "window", delayMs: 1000 },
    { type: "scroll", target: "window", delayMs: 1000 },
    { type: "scroll", target: "window", delayMs: 1000 },
    { type: "scroll", target: "window", delayMs: 1000 },
    { type: "scroll", target: "window", delayMs: 1000 },
    { type: "scroll", target: "window", delayMs: 1000 },
    { type: "scroll", target: "window", delayMs: 1000 },
    { type: "scroll", target: "window", delayMs: 1000 },
    { type: "scroll", target: "window", delayMs: 1000 },
    { type: "scroll", target: "window", delayMs: 1000 }, // Trigger EXCESSIVE_SCROLL
    { type: "url_change", target: "https://demo.fricta.ai", delayMs: 1000 },
    { type: "url_change", target: "https://demo.fricta.ai/login", delayMs: 1000 },
    { type: "url_change", target: "https://demo.fricta.ai", delayMs: 1000 },
    { type: "url_change", target: "https://demo.fricta.ai/login", delayMs: 1000 }, // Trigger NAVIGATION_LOOP
  ];

  for (const i of interactions) {
    currentTimestamp += i.delayMs;
    await prisma.interactionEvent.create({
      data: {
        sessionId: sessionId,
        type: i.type,
        target: i.target,
        timestamp: new Date(currentTimestamp),
      }
    });
  }

  console.log(`\n✅ Created Mock Session: ${sessionId}`);
  console.log(`\nTo generate the UX Report for this session, run:`);
  console.log(`curl -X POST http://localhost:3001/api/reports/${sessionId}/generate`);
  console.log(`\nThen view it in the dashboard at: http://localhost:5173/app/reports/${sessionId}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
