import { prisma } from '@fricta/db';
import { PatternType } from '../types';

export class PatternDetector {
  static async detectPatterns(projectId: string) {
    const logs: string[] = [];

    const savePattern = async (
      name: string,
      type: PatternType,
      description: string,
      confidence: number,
      evidenceLinks: Array<{ type: string; refId: string; description: string }>
    ) => {
      const existing = await prisma.learningPattern.findFirst({
        where: { projectId, patternName: name, patternType: type }
      });

      let patternId = '';
      if (existing) {
        await prisma.learningPattern.update({
          where: { id: existing.id },
          data: { description, confidence }
        });
        patternId = existing.id;
      } else {
        const created = await prisma.learningPattern.create({
          data: {
            projectId,
            patternName: name,
            patternType: type,
            description,
            confidence
          }
        });
        patternId = created.id;
      }

      // Re-create evidence links
      await prisma.patternEvidence.deleteMany({ where: { patternId } }).catch(() => {});
      for (const ev of evidenceLinks) {
        await prisma.patternEvidence.create({
          data: {
            projectId,
            patternId,
            evidenceType: ev.type,
            referenceId: ev.refId,
            description: ev.description
          }
        });
      }

      logs.push(`Detected pattern [${type}]: "${name}"`);
    };

    // 1. Success Patterns: Positive Outcome Attributions
    const positiveOutcomes = await prisma.productOutcome.findMany({
      where: { projectId, verdict: 'POSITIVE' },
      include: { impacts: true }
    });

    for (const out of positiveOutcomes) {
      await savePattern(
        `Positive strategic lift: "${out.title}"`,
        'SUCCESS',
        `Attributed positive strategic improvement. Evaluation details: ${out.description}`,
        0.90,
        [{ type: 'OUTCOME', refId: out.id, description: `Outcome evaluation details.` }]
      );
    }

    // 2. Failure Patterns: Negative Strategic Outcomes
    const negativeOutcomes = await prisma.productOutcome.findMany({
      where: { projectId, verdict: 'NEGATIVE' }
    });

    for (const out of negativeOutcomes) {
      await savePattern(
        `Negative outcome trend: "${out.title}"`,
        'FAILURE',
        `Strategic target missed during outcome evaluations. Details: ${out.description}`,
        0.95,
        [{ type: 'OUTCOME', refId: out.id, description: `Negative outcome evaluation logs.` }]
      );
    }

    // 3. Friction Patterns: Repeated Persona Dropoffs
    const sessions = await prisma.workflowSession.findMany({
      where: { projectId, status: 'FAILED' }
    });

    const personaFails: Record<string, typeof sessions> = {};
    for (const s of sessions) {
      if (s.persona) {
        if (!personaFails[s.persona]) {
          personaFails[s.persona] = [];
        }
        personaFails[s.persona].push(s);
      }
    }

    for (const [persona, failedSessions] of Object.entries(personaFails)) {
      if (failedSessions.length > 2) {
        const firstSession = failedSessions[0];
        await savePattern(
          `Repeated friction dropoffs: ${persona}`,
          'FRICTION',
          `Persona cohort "${persona}" encountered elevated friction resulting in ${failedSessions.length} session dropoffs.`,
          0.85,
          failedSessions.slice(0, 3).map(s => ({
            type: 'REPLAY',
            refId: s.id,
            description: `Session failure details logged for persona: ${persona}`
          }))
        );
      }
    }

    // 4. Repeated Risk Patterns: Blocking Dependency Overrides
    const dependencies = await prisma.dependencyRecord.findMany({
      where: { projectId, dependencyType: 'BLOCKING', riskScore: { gt: 60.0 } }
    });

    for (const dep of dependencies) {
      await savePattern(
        `Roadmap Blocking Chain Bottleneck`,
        'RISK',
        `An initiative dependency blocks subsequent deployment runs with propagated risk score: ${dep.riskScore.toFixed(0)}%.`,
        0.90,
        [{ type: 'ANOMALY', refId: dep.id, description: `Critical roadmap path dependency: Type ${dep.dependencyType}.` }]
      );
    }

    return logs;
  }
}
