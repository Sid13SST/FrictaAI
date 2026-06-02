import { prisma } from '@fricta/db';

export interface TimelineEvent {
  id: string;
  eventType: 'SNAPSHOT_CAPTURED' | 'RECURRENCE_DETECTED';
  title: string;
  description: string;
  timestamp: Date;
}

export class LearningTimelineExplorer {
  static async getLearningTimeline(projectId: string): Promise<TimelineEvent[]> {
    const snapshots = await prisma.learningSnapshot.findMany({
      where: { projectId },
      orderBy: { recordedAt: 'desc' },
      take: 20
    });

    const recurrences = await prisma.recurrenceRecord.findMany({
      where: { projectId },
      orderBy: { timestamp: 'desc' },
      take: 30
    });

    const events: TimelineEvent[] = [];

    for (const snap of snapshots) {
      events.push({
        id: snap.id,
        eventType: 'SNAPSHOT_CAPTURED',
        title: 'Learning Snapshot Archived',
        description: `Captured ${snap.patternCount} patterns and ${snap.lessonCount} organizational lessons.`,
        timestamp: snap.recordedAt
      });
    }

    for (const rec of recurrences) {
      events.push({
        id: rec.id,
        eventType: 'RECURRENCE_DETECTED',
        title: `Pattern Recurred: ${rec.entityType}`,
        description: `Recurrence log observed: "${rec.details}". Reference ID: ${rec.referenceId.substring(0, 8)}...`,
        timestamp: rec.timestamp
      });
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}
