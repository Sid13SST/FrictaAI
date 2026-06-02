import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { prisma } from './src/index';
import { EntityManager } from '../knowledge-network/src/entities/index';
import { RelationshipEngine } from '../knowledge-network/src/relationships/index';
import { DiscoveryEngine } from '../knowledge-network/src/discovery/index';
import { GraphHealthEngine } from '../knowledge-network/src/health/index';
import { KnowledgeGraphEngine } from '../knowledge-network/src/graph/index';

async function seedKnowledgeNetwork() {
  console.log('🌱 Seeding Phase 14 Part 1: Organizational Knowledge Graph & Intelligence Network...');

  const project = await prisma.project.findFirst();
  if (!project) {
    console.error('❌ No project found. Run other phase seeders first.');
    process.exit(1);
  }
  console.log(`  → Using project: ${project.projectName} (${project.id})`);

  console.log('  → Cleaning old knowledge network records...');
  await prisma.graphHealthRecord.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.knowledgeTimeline.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.discoveryRecord.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.relationshipEvidence.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.graphSnapshot.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.evidenceLink.deleteMany({ where: { relationship: { projectId: project.id } } }).catch(() => {});
  await prisma.knowledgeRelationship.deleteMany({ where: { projectId: project.id } }).catch(() => {});
  await prisma.knowledgeEntity.deleteMany({ where: { projectId: project.id } }).catch(() => {});

  console.log('  → Syncing project nodes...');
  const entityLogs = await EntityManager.syncProjectEntities(project.id);
  console.log(`  ✓ Entities synchronized. Logs:`, entityLogs);

  console.log('  → Mapping entity relationships...');
  const relLogs = await RelationshipEngine.syncProjectRelationships(project.id);
  console.log(`  ✓ Relationships established. Logs:`, relLogs);

  console.log('  → Running intelligence discovery scanner...');
  const discoveries = await DiscoveryEngine.runDiscovery(project.id);
  console.log(`  ✓ Scanner finished. Found ${discoveries.length} discovery items.`);

  console.log('  → Capturing initial graph snapshot audit...');
  const snapshot = await KnowledgeGraphEngine.getGraphSnapshot(project.id);
  console.log(`  ✓ Graph snapshot saved. ID: ${snapshot.id}`);

  console.log('  → Evaluating network health and density metrics...');
  const health = await GraphHealthEngine.evaluateGraphHealth(project.id);
  console.log(`  ✓ Graph stability index: ${health.stabilityIndex.toFixed(0)}%. Density: ${health.density.toFixed(1)}%`);

  console.log('🏁 Phase 14 Part 1: Organizational Knowledge Network seeding completed successfully!');
}

seedKnowledgeNetwork()
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
