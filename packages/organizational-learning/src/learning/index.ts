import { prisma } from '@fricta/db';
import { PatternDetector } from '../patterns';
import { SuccessCatalogManager } from '../success';
import { FailureCatalogManager } from '../failures';

export class LearningEngine {
  static async runLearningCycle(projectId: string) {
    const logs: string[] = [];

    // 1. Run pattern detection
    const patternLogs = await PatternDetector.detectPatterns(projectId);
    logs.push(...patternLogs);

    // 2. Sync success catalog
    const successLogs = await SuccessCatalogManager.syncSuccessPatterns(projectId);
    logs.push(...successLogs);

    // 3. Sync failure catalog
    const failureLogs = await FailureCatalogManager.syncFailurePatterns(projectId);
    logs.push(...failureLogs);

    // 4. Capture Learning Snapshot
    const patternCount = await prisma.learningPattern.count({ where: { projectId } });
    const lessonCount = await prisma.organizationalLesson.count({ where: { projectId } });

    const patterns = await prisma.learningPattern.findMany({ where: { projectId } });
    const lessons = await prisma.organizationalLesson.findMany({ where: { projectId } });

    const snapshot = await prisma.learningSnapshot.create({
      data: {
        projectId,
        patternCount,
        lessonCount,
        snapshotData: JSON.parse(JSON.stringify({ patterns, lessons }))
      }
    });

    logs.push(`Saved Learning Snapshot. ID: ${snapshot.id}`);

    return {
      success: true,
      logs,
      snapshotId: snapshot.id
    };
  }

  static async getSimilarCases(projectId: string, title: string) {
    // Return mock similar cases for solo mode/explainable matches
    const cases = await prisma.historicalCase.findMany({
      where: { projectId }
    });

    const matches = cases.map(c => {
      let score = 0.1;
      const t = title.toLowerCase();
      const ct = c.title.toLowerCase();
      
      if (t.includes(ct) || ct.includes(t)) {
        score = 0.9;
      } else if (t.split(' ').some(w => w.length > 3 && ct.includes(w))) {
        score = 0.5;
      }

      return {
        case: c,
        matchScore: score
      };
    }).sort((a, b) => b.matchScore - a.matchScore);

    return matches.slice(0, 5);
  }
}
