import { prisma } from '@fricta/db';
import { PersonaEvolutionProgress } from '../types';

export class PersonaEvolutionTracker {
  /**
   * Tracks user groups' adaptation rate and cognitive fatigue over sequential runs.
   */
  static async evaluatePersonaEvolution(projectId: string, workspaceId: string | null) {
    // 1. Fetch completed sessions with their persona and cognitive state details
    const sessions = await prisma.workflowSession.findMany({
      where: { projectId, status: 'COMPLETED' },
      include: {
        scores: true,
        cognitiveSignals: true
      },
      orderBy: { createdAt: 'asc' },
      take: 20
    });

    if (sessions.length === 0) {
      return [];
    }

    const personaGroups = new Map<string, typeof sessions>();
    for (const s of sessions) {
      if (s.persona) {
        const list = personaGroups.get(s.persona) || [];
        list.push(s);
        personaGroups.set(s.persona, list);
      }
    }

    const evolutions: any[] = [];

    for (const [personaName, group] of personaGroups.entries()) {
      // Compute averages
      const totalFriction = group.reduce((acc, s) => {
        const score = s.scores[0];
        const friction = score ? (100 - score.overallScore) : 20;
        return acc + friction;
      }, 0);
      const avgFriction = totalFriction / group.length;

      const totalCompletion = group.reduce((acc, s) => {
        const score = s.scores[0];
        const completion = score ? score.overallScore : 100;
        return acc + completion;
      }, 0);
      const avgCompletion = totalCompletion / group.length;

      // Simulation steps and cognitive fatigue curve
      const steps = Array.from({ length: 5 }, (_, i) => i + 1);
      const loads = steps.map((step) => {
        // Calculate dynamic fatigue load curves
        const multiplier = personaName.toLowerCase().includes('beginner') ? 1.5 : 1.0;
        return Math.min(100, Math.round((step * 12 + avgFriction * 0.4) * multiplier));
      });

      // Upsert persona evolution record
      const existing = await prisma.personaEvolution.findFirst({
        where: { projectId, personaName }
      });

      if (existing) {
        const updated = await prisma.personaEvolution.update({
          where: { id: existing.id },
          data: {
            adaptationRate: 90 - avgFriction * 0.5,
            frictionIndex: avgFriction,
            successRate: avgCompletion,
            fatigueTrend: { steps, loads }
          }
        });
        evolutions.push(updated);
      } else {
        const created = await prisma.personaEvolution.create({
          data: {
            workspaceId,
            projectId,
            personaName,
            adaptationRate: 90 - avgFriction * 0.5,
            frictionIndex: avgFriction,
            successRate: avgCompletion,
            fatigueTrend: { steps, loads }
          }
        });
        evolutions.push(created);
      }
    }

    return evolutions;
  }

  /**
   * Returns list of persona evolutions.
   */
  static async getPersonaEvolutions(projectId: string, workspaceId: string | null) {
    return prisma.personaEvolution.findMany({
      where: {
        projectId,
        workspaceId
      },
      orderBy: { successRate: 'asc' }
    });
  }
}
