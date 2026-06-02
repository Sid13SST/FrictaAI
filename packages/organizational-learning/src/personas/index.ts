import { prisma } from '@fricta/db';

export interface PersonaMetrics {
  persona: string;
  totalSessions: number;
  completedSessions: number;
  failedSessions: number;
  completionRate: number;
  exitPointStats: Record<string, number>;
}

export class PersonaBehaviorLearner {
  static async learnPersonaBehaviors(projectId: string): Promise<PersonaMetrics[]> {
    const sessions = await prisma.workflowSession.findMany({
      where: { projectId }
    });

    const groups: Record<string, typeof sessions> = {};
    for (const s of sessions) {
      if (!s.persona) continue;
      if (!groups[s.persona]) {
        groups[s.persona] = [];
      }
      groups[s.persona].push(s);
    }

    const metricsList: PersonaMetrics[] = [];

    for (const [persona, personaSessions] of Object.entries(groups)) {
      const total = personaSessions.length;
      const completed = personaSessions.filter(s => s.status === 'COMPLETED').length;
      const failed = personaSessions.filter(s => s.status === 'FAILED').length;
      const completionRate = total > 0 ? (completed / total) * 100 : 100;

      // Compile exit point stats (using goal or last steps from thoughts/actions if logged)
      const exitPointStats: Record<string, number> = {};
      
      metricsList.push({
        persona,
        totalSessions: total,
        completedSessions: completed,
        failedSessions: failed,
        completionRate,
        exitPointStats
      });
    }

    return metricsList;
  }
}
