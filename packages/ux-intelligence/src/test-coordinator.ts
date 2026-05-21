import { PrismaClient } from '@fricta/db';
import { UXIntelligenceCoordinator } from './coordinator';

const prisma = new PrismaClient();
const coordinator = new UXIntelligenceCoordinator(prisma);

async function main() {
  console.log('=== Running UX Intelligence DB Integration Test ===');

  try {
    // 1. Fetch the first session in the DB
    const firstSession = await prisma.workflowSession.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!firstSession) {
      console.log('❌ No sessions found in the database. Run a workflow first, then execute this test.');
      return;
    }

    const sessionId = firstSession.id;
    console.log(`Running UX Heuristics analysis on real Session ID: ${sessionId}`);
    console.log(`Goal of Session: ${firstSession.goal || 'None'}`);

    // 2. Execute full coordinator analysis
    const result = await coordinator.analyzeSession(sessionId);

    console.log('\n--- Analysis Completed Successfully ---');
    console.log('Scores:', JSON.stringify(result.scores, null, 2));
    console.log(`Total Findings Generated: ${result.findings.length}`);
    console.log(`Total Cognitive Signals Generated: ${result.cognitiveSignals.length}`);
    
    console.log('\nTop 3 Findings:');
    result.findings.slice(0, 3).forEach((finding, index) => {
      console.log(`\nFinding #${index + 1}:`);
      console.log(`  Type: ${finding.findingType}`);
      console.log(`  Severity: ${finding.severity}`);
      console.log(`  Title: ${finding.title}`);
      console.log(`  Persona: ${finding.personaType}`);
      console.log(`  Evidence: ${finding.evidence}`);
      console.log(`  Recommendation: ${finding.recommendation}`);
    });

    // 3. Database validation
    const dbFindingsCount = await prisma.uXFinding.count({
      where: { workflowSessionId: sessionId }
    });
    const dbSignalsCount = await prisma.cognitiveSignal.count({
      where: { workflowSessionId: sessionId }
    });

    console.log('\n--- Database Validation ---');
    console.log(`Findings successfully saved in DB: ${dbFindingsCount}`);
    console.log(`Cognitive Signals successfully saved in DB: ${dbSignalsCount}`);

    if (dbFindingsCount === result.findings.length && dbSignalsCount === result.cognitiveSignals.length) {
      console.log('\n🎉 INTEGRATION TEST PASSED SUCCESSFULLY! 🎉');
    } else {
      console.log('\n❌ INTEGRATION TEST FAILED: DB counts do not match generated counts!');
    }

  } catch (err: any) {
    console.error('❌ Error during coordinator integration test:', err.stack || err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
