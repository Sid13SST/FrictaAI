import { prisma } from '@fricta/db';
import { LessonSynthesizer } from '../lessons';
import { PrincipleDiscoverer } from '../principles';
import { MemorySynthesizer } from '../synthesis';
import { OutcomeWisdomAnalyzer } from '../outcomes';

export class WisdomEngine {
  static async runWisdomCycle(projectId: string) {
    const logs: string[] = [];

    // 1. Discover principles
    const pLogs = await PrincipleDiscoverer.discoverPrinciples(projectId);
    logs.push(...pLogs);

    // 2. Synthesize lessons
    const lLogs = await LessonSynthesizer.synthesizeLessons(projectId);
    logs.push(...lLogs);

    // 3. Synthesize memory (Long term trends)
    const mLogs = await MemorySynthesizer.synthesizeMemory(projectId);
    logs.push(...mLogs);

    // 4. Strategic learnings
    const sLogs = await OutcomeWisdomAnalyzer.evaluateStrategicLearnings(projectId);
    logs.push(...sLogs);

    // 5. Create WisdomSnapshot
    const lessonsCount = await prisma.institutionalLesson.count({ where: { projectId } });
    const principlesCount = await prisma.organizationalPrinciple.count({ where: { projectId } });
    
    const lessons = await prisma.institutionalLesson.findMany({ where: { projectId } });
    const principles = await prisma.organizationalPrinciple.findMany({ where: { projectId } });
    const trends = await prisma.longTermTrend.findMany({ where: { projectId } });

    const snapshot = await prisma.wisdomSnapshot.create({
      data: {
        projectId,
        lessonsCount,
        principlesCount,
        snapshotData: JSON.parse(JSON.stringify({ lessons, principles, trends }))
      }
    });

    logs.push(`✓ Saved Wisdom Snapshot. ID: ${snapshot.id}`);

    return {
      success: true,
      logs,
      snapshotId: snapshot.id
    };
  }
}
