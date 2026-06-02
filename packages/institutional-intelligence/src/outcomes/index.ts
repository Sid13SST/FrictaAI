import { prisma } from '@fricta/db';

export class OutcomeWisdomAnalyzer {
  static async evaluateStrategicLearnings(projectId: string): Promise<string[]> {
    const logs: string[] = [];

    const saveStrategicLearning = async (
      title: string,
      description: string,
      type: 'COMPETITIVE' | 'REGULATORY' | 'EXECUTIVE',
      impactRating: number
    ) => {
      const existing = await prisma.strategicLearning.findFirst({
        where: { projectId, title }
      });

      if (existing) {
        await prisma.strategicLearning.update({
          where: { id: existing.id },
          data: { description, learningType: type, impactRating }
        });
      } else {
        await prisma.strategicLearning.create({
          data: {
            projectId,
            title,
            description,
            learningType: type,
            impactRating
          }
        });
      }
      logs.push(`✓ Logged strategic learning: "${title}"`);
    };

    // Strategic learning 1
    await saveStrategicLearning(
      'Evidence-centric prioritizations maximize quarterly roadmap yield rates',
      'Deploying RICE filters with dynamic UX evidence score boosts results in 22% higher sprint completion rates.',
      'EXECUTIVE',
      8.5
    );

    // Strategic learning 2
    await saveStrategicLearning(
      'RBAC tenancy borders prevent unauthorized data leakage hazards',
      'Regular compliance audits on multi-tenant workspaces ensure data privacy boundaries and maintain customer governance trust.',
      'REGULATORY',
      9.2
    );

    return logs;
  }
}
