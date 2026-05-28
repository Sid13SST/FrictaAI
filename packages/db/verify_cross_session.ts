import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('🔍 Starting database queries for Cross-Session & Longitudinal verification...');

  // 1. CrossSessionPattern
  const patterns = await prisma.crossSessionPattern.findMany();
  console.log(`\n📋 Cross-Session Patterns Count: ${patterns.length}`);
  for (const p of patterns) {
    console.log(`- Pattern: "${p.patternName}" | Severity: "${p.severity}" | Category: "${p.category}"`);
    console.log(`  Description: ${p.description}`);
  }

  // 2. HistoricalRegression
  const regressions = await prisma.historicalRegression.findMany();
  console.log(`\n📉 Historical Regressions Count: ${regressions.length}`);
  for (const r of regressions) {
    console.log(`- Metric: "${r.metricName}" | Status: "${r.status}" | Change: ${r.changePercent}%`);
    console.log(`  Base: ${r.baseValue} -> Compare: ${r.compareValue}`);
  }

  // 3. OrganizationalTrend
  const trends = await prisma.organizationalTrend.findMany();
  console.log(`\n📊 Organizational Trends Count: ${trends.length}`);
  for (const t of trends) {
    console.log(`- Type: "${t.trendType}" | Date: ${t.timestamp.toISOString()} | Score: ${t.scoreValue}`);
  }

  // 4. PersonaEvolution
  const evolutions = await prisma.personaEvolution.findMany();
  console.log(`\n🧬 Persona Evolutions Count: ${evolutions.length}`);
  for (const e of evolutions) {
    console.log(`- Persona: "${e.personaName}" | Success Rate: ${e.successRate}% | Friction Index: ${e.frictionIndex}`);
  }

  // 5. WorkflowStabilityHistory
  const histories = await prisma.workflowStabilityHistory.findMany();
  console.log(`\n⏱️ Workflow Stability History Count: ${histories.length}`);
  for (const h of histories) {
    console.log(`- Run ID: "${h.runId}" | Stability: ${h.stabilityScore} | Completion: ${h.completionRate}%`);
  }

  // 6. LongitudinalSignal
  const signals = await prisma.longitudinalSignal.findMany();
  console.log(`\n📡 Longitudinal Signals Count: ${signals.length}`);
  for (const s of signals) {
    console.log(`- Selector: "${s.elementSelector}" | Type: "${s.signalType}" | Frequency: ${s.frequency}`);
  }

  // 7. SessionCorrelation
  const correlations = await prisma.sessionCorrelation.findMany();
  console.log(`\n🤝 Session Correlations Count: ${correlations.length}`);
  for (const c of correlations) {
    console.log(`- Similarity: ${c.similarity} | Shared Frictions: ${Array.isArray(c.sharedFriction) ? c.sharedFriction.length : 0}`);
  }

  // 8. UXMemorySnapshot
  const snapshots = await prisma.uXMemorySnapshot.findMany();
  console.log(`\n📦 UX Memory Snapshots Count: ${snapshots.length}`);
  for (const s of snapshots) {
    console.log(`- Snapshot Name: "${s.snapshotName}" | Health: ${s.trendHealth} | Patterns: ${s.patternCount}`);
  }

  console.log('\n✅ Cross-Session and Longitudinal database queries completed successfully!');
}

verify()
  .catch((e) => {
    console.error('❌ Verification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
