import { PrismaClient } from '@fricta/db';

export class SummarySynthesisEngine {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Evaluates how the user personas are impacted.
   */
  async synthesizePersonaImpact(projectId: string): Promise<any[]> {
    const findings = await this.prisma.uXFinding.findMany({
      where: {
        session: { projectId }
      }
    });

    const personaTypes = ['BEGINNER', 'POWER_USER', 'FIRST_TIME_USER', 'DISTRACTED_USER', 'STANDARD'];
    const summary = personaTypes.map((type: string) => {
      const typeFindings = findings.filter((f: any) => f.personaType?.toUpperCase() === type);
      const criticals = typeFindings.filter((f: any) => f.severity === 'CRITICAL').length;
      const highs = typeFindings.filter((f: any) => f.severity === 'HIGH').length;

      let scoreDelta = 0;
      if (criticals > 0) scoreDelta = -25;
      else if (highs > 0) scoreDelta = -10;

      return {
        personaType: type,
        totalIssues: typeFindings.length,
        criticalCount: criticals,
        highCount: highs,
        estimatedSatisfaction: Math.max(40, 100 + scoreDelta)
      };
    });

    return summary;
  }

  /**
   * Groups findings and reactions chronologically to outline friction escalations.
   */
  async synthesizeFrictionEscalation(sessionId: string): Promise<any> {
    const reactions = await this.prisma.frictionReaction.findMany({
      where: { workflowSessionId: sessionId },
      orderBy: { stepIndex: 'asc' }
    });

    const hesitations = await this.prisma.hesitationSignal.findMany({
      where: { workflowSessionId: sessionId },
      orderBy: { stepIndex: 'asc' }
    });

    const escalations = reactions.map((r: any) => {
      const stepHesitations = hesitations.filter((h: any) => h.stepIndex === r.stepIndex);
      return {
        stepIndex: r.stepIndex,
        reactionType: r.reactionType,
        trigger: r.triggerSource,
        intensity: r.intensity,
        hesitationsCount: stepHesitations.length,
        hasEscalated: r.intensity > 0.6 || stepHesitations.some((h: any) => h.severity === 'HIGH')
      };
    });

    return {
      sessionId,
      totalReactions: reactions.length,
      averageIntensity: reactions.length > 0 ? reactions.reduce((acc: any, curr: any) => acc + curr.intensity, 0) / reactions.length : 0,
      escalationTimeline: escalations
    };
  }
}
