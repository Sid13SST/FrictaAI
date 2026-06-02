import { prisma } from '@fricta/db';

export class PersonaWisdomLearner {
  static async compilePersonaWisdom(projectId: string) {
    const sessions = await prisma.workflowSession.findMany({
      where: { projectId }
    });

    const personaGroups: Record<string, { total: number; completed: number; abandoned: number }> = {};

    for (const s of sessions) {
      const p = s.persona || 'Unknown Persona';
      if (!personaGroups[p]) {
        personaGroups[p] = { total: 0, completed: 0, abandoned: 0 };
      }
      personaGroups[p].total++;
      if (s.status === 'COMPLETED') {
        personaGroups[p].completed++;
      } else if (s.status === 'ABANDONED') {
        personaGroups[p].abandoned++;
      }
    }

    return Object.entries(personaGroups).map(([name, stats]) => ({
      personaName: name,
      totalSessions: stats.total,
      completionRate: stats.total > 0 ? stats.completed / stats.total : 0,
      abandonmentRate: stats.total > 0 ? stats.abandoned / stats.total : 0
    }));
  }
}
