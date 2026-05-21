import { PrismaClient } from '@fricta/db';
import { VisualIntelligenceCoordinator } from './analysis';

const prisma = new PrismaClient();
const coordinator = new VisualIntelligenceCoordinator(prisma);

async function main() {
  const sessionId = 'bcd7886c-d9d8-4b3c-8e25-b6dbe9d1d6f5';
  console.log(`Running Visual Intelligence analysis on session: ${sessionId}`);

  try {
    // Run the analysis (disable forceAIVision by default for standard testing)
    const result = await coordinator.analyzeSession(sessionId, {
      forceAIVision: false
    });

    console.log('\n--- Analysis Completed Successfully ---');
    console.log('Scores:', JSON.stringify(result.scores, null, 2));
    console.log(`Total Findings Generated: ${result.findings.length}`);
    console.log('\nTop 5 Findings:');
    result.findings.slice(0, 5).forEach((finding, index) => {
      console.log(`\nFinding #${index + 1}:`);
      console.log(`  Type: ${finding.findingType}`);
      console.log(`  Severity: ${finding.severity}`);
      console.log(`  Title: ${finding.title}`);
      console.log(`  Description: ${finding.description}`);
      console.log(`  Bounding Boxes count: ${finding.boundingBoxes.length}`);
    });

    // Check database
    const dbFindingsCount = await prisma.visualFinding.count({
      where: { workflowSessionId: sessionId }
    });
    const dbScore = await prisma.visualScore.findFirst({
      where: { workflowSessionId: sessionId },
      orderBy: { createdAt: 'desc' }
    });

    console.log('\n--- Database Validation ---');
    console.log(`Findings saved in DB: ${dbFindingsCount}`);
    console.log(`Score saved in DB:`, JSON.stringify(dbScore, null, 2));

  } catch (err: any) {
    console.error('Error during analysis:', err.stack || err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
