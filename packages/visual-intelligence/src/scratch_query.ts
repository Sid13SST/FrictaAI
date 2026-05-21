import { PrismaClient } from '@fricta/db';

const prisma = new PrismaClient();

async function main() {
  const sessionId = '82843560-2bf0-4fef-a500-01eb970f911e';
  console.log(`--- Querying Visual Findings for Workflow Session ID: ${sessionId} ---`);
  try {
    const screenshots = await prisma.workflowScreenshot.findMany({
      where: { workflowSessionId: sessionId }
    });
    console.log(`Workflow Screenshots Count: ${screenshots.length}`);
    for (const s of screenshots) {
      console.log(`- Screenshot ID: ${s.id} | Path: ${s.filePath}`);
    }

    const findings = await prisma.visualFinding.findMany({
      where: { workflowSessionId: sessionId }
    });
    console.log(`\nVisual Findings Count: ${findings.length}`);
    for (const f of findings) {
      console.log(`- Finding ID: ${f.id} | Screenshot ID: ${f.screenshotId} | Type: ${f.findingType} | Title: ${f.title}`);
    }
  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
