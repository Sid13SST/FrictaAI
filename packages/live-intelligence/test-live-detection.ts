import { prisma } from '@fricta/db';
import { LiveAnomalyDetector } from './src/detection';

async function test() {
  console.log('[TestLiveDetection] Starting integration test...');

  // 1. Fetch the seeded live session
  const session = await prisma.liveSession.findFirst({
    where: { sessionKey: 'fricta_sess_chrome_mac_usa_001' },
  });

  if (!session) {
    console.error('[TestLiveDetection] Seeded session not found. Please run seed script first.');
    process.exit(1);
  }

  console.log(`[TestLiveDetection] Running anomaly detection pipeline for Session ID: ${session.id}`);

  // 2. Trigger pipeline
  await LiveAnomalyDetector.analyzeSessionEvents(session.id);

  // 3. Query generated metrics to verify
  const anomaliesCount = await prisma.uXAnomaly.count({
    where: { projectId: session.projectId },
  });

  const survivabilityCount = await prisma.survivabilityMetric.count({
    where: { projectId: session.projectId },
  });

  const alertsCount = await prisma.intelligenceAlert.count({
    where: { projectId: session.projectId },
  });

  const patternsCount = await prisma.behavioralPattern.count({
    where: { projectId: session.projectId },
  });

  console.log('[TestLiveDetection] Results in Database:');
  console.log(`- UX Anomalies: ${anomaliesCount}`);
  console.log(`- Survivability Metrics: ${survivabilityCount}`);
  console.log(`- Intelligence Alerts: ${alertsCount}`);
  console.log(`- Behavioral Patterns: ${patternsCount}`);

  if (anomaliesCount > 0 && survivabilityCount > 0) {
    console.log('[TestLiveDetection] Integration test PASSED successfully!');
  } else {
    console.error('[TestLiveDetection] Integration test FAILED. No metrics or anomalies detected.');
    process.exit(1);
  }
}

test().catch((err) => {
  console.error('[TestLiveDetection] Test execution failed:', err);
  process.exit(1);
});
