import { prisma } from '@fricta/db';
import { LongitudinalSignalDetail } from '../types';

export class LongitudinalSignalAnalyzer {
  /**
   * Identifies element-level signals (hesitations/mismatches) recurring across sessions.
   */
  static async analyzeLongitudinalSignals(projectId: string, workspaceId: string | null): Promise<LongitudinalSignalDetail[]> {
    const sessions = await prisma.workflowSession.findMany({
      where: { projectId },
      include: { cognitiveSignals: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const signalMap = new Map<string, {
      count: number;
      severities: number[];
      sessionIds: string[];
      timestamps: string[];
    }>();

    for (const s of sessions) {
      for (const sig of s.cognitiveSignals) {
        const meta = (sig.metadata as any) || {};
        const elementSelector = meta.elementSelector || '';
        if (!elementSelector) continue;

        const key = `${elementSelector}:${sig.signalType}`;
        const existing = signalMap.get(key) || {
          count: 0,
          severities: [],
          sessionIds: [],
          timestamps: []
        };

        existing.count++;
        // Translate intensity (0.0 to 1.0) to a mental effort scale (0 to 100)
        const mentalEffort = Math.round(sig.intensity * 100);
        existing.severities.push(mentalEffort);
        existing.sessionIds.push(s.id);
        existing.timestamps.push(s.createdAt.toISOString());
        signalMap.set(key, existing);
      }
    }

    const result: LongitudinalSignalDetail[] = [];

    for (const [key, details] of signalMap.entries()) {
      if (details.count >= 2) {
        const [elementSelector, signalType] = key.split(':');
        const avgSeverity = details.severities.reduce((acc, v) => acc + v, 0) / details.severities.length;

        // Upsert DB record
        const existingRecord = await prisma.longitudinalSignal.findFirst({
          where: { projectId, elementSelector, signalType }
        });

        if (existingRecord) {
          await prisma.longitudinalSignal.update({
            where: { id: existingRecord.id },
            data: {
              frequency: details.count,
              averageSeverity: avgSeverity,
              historicalBasis: {
                sessionIds: details.sessionIds,
                timestamps: details.timestamps
              }
            }
          });
        } else {
          await prisma.longitudinalSignal.create({
            data: {
              workspaceId,
              projectId,
              elementSelector,
              signalType,
              frequency: details.count,
              averageSeverity: avgSeverity,
              historicalBasis: {
                sessionIds: details.sessionIds,
                timestamps: details.timestamps
              }
            }
          });
        }

        result.push({
          elementSelector,
          signalType: signalType as any,
          frequency: details.count,
          averageSeverity: avgSeverity,
          historicalBasis: {
            sessionIds: details.sessionIds,
            timestamps: details.timestamps
          }
        });
      }
    }

    return result;
  }
}
