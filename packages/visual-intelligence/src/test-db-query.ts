import { PrismaClient } from '@fricta/db';

const prisma = new PrismaClient();

async function main() {
  console.log('Querying Fricta Database sessions...');
  try {
    const sessions = await prisma.workflowSession.findMany({
      include: {
        _count: {
          select: {
            screenshots: true,
            workflowScreenshots: true,
            visualFindings: true,
            visualScores: true,
          }
        }
      }
    });

    console.log(`Found ${sessions.length} sessions:`);
    for (const session of sessions) {
      console.log(`- Session ID: ${session.id}`);
      console.log(`  Goal: ${session.goal}`);
      console.log(`  Status: ${session.status}`);
      console.log(`  Step count: ${session.stepCount}`);
      console.log(`  Old Screenshots Count: ${session._count.screenshots}`);
      console.log(`  Workflow Screenshots Count: ${session._count.workflowScreenshots}`);
      console.log(`  Visual Findings Count: ${session._count.visualFindings}`);
      console.log(`  Visual Scores Count: ${session._count.visualScores}`);
      
      if (session._count.workflowScreenshots > 0) {
        const firstScreenshot = await prisma.workflowScreenshot.findFirst({
          where: { workflowSessionId: session.id }
        });
        console.log(`  Example Screenshot ID: ${firstScreenshot?.id}`);
        console.log(`  Example Screenshot Path: ${firstScreenshot?.filePath}`);
        console.log(`  Example Screenshot Metadata: ${JSON.stringify(firstScreenshot?.metadata)}`);
      }
    }
  } catch (err: any) {
    console.error('Error querying database:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
