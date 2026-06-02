import { prisma } from '@fricta/db';
import { DiscoveryType } from '../types';

export class DiscoveryEngine {
  static async runDiscovery(projectId: string) {
    const discovered: any[] = [];

    const saveDiscovery = async (
      type: DiscoveryType,
      title: string,
      details: string,
      confidence: number,
      refEntityId?: string
    ) => {
      const existing = await prisma.discoveryRecord.findFirst({
        where: { projectId, title, discoveryType: type }
      });

      if (!existing) {
        const created = await prisma.discoveryRecord.create({
          data: {
            projectId,
            entityId: refEntityId,
            discoveryType: type,
            title,
            details,
            confidence
          }
        });
        
        await prisma.knowledgeTimeline.create({
          data: {
            projectId,
            entityId: refEntityId,
            eventType: 'DISCOVERY_LOGGED',
            title: `Discovered Strategic ${type}`,
            description: `Automated scan found: "${title}" (${details})`
          }
        }).catch(() => {});

        discovered.push(created);
      }
    };

    // 1. Discovery: Neglected Objective
    const objectives = await prisma.strategicObjective.findMany({
      where: { projectId },
      include: { initiatives: true }
    });

    for (const obj of objectives) {
      if (obj.initiatives.length === 0) {
        const entity = await prisma.knowledgeEntity.findFirst({
          where: { projectId, entityType: 'OBJECTIVE', referenceId: obj.id }
        });
        await saveDiscovery(
          'OBJECTIVE',
          `Unassigned Objective Gap: "${obj.title}"`,
          `This strategic objective lacks any mapped product initiatives on the current roadmap quarter.`,
          0.90,
          entity?.id
        );
      }
    }

    // 2. Discovery: High Risk Initiative Dependency
    const dependencies = await prisma.dependencyRecord.findMany({
      where: { projectId, dependencyType: 'BLOCKING', riskScore: { gt: 60.0 } }
    });

    for (const dep of dependencies) {
      const entity = await prisma.knowledgeEntity.findFirst({
        where: { projectId, entityType: 'INITIATIVE', referenceId: dep.sourceInitiativeId }
      });
      await saveDiscovery(
        'RISK',
        `Critical Roadmap Bottleneck detected`,
        `Initiative dependency chain is blocked by a critical path item with propagated risk of ${dep.riskScore.toFixed(1)}%.`,
        0.95,
        entity?.id
      );
    }

    // 3. Discovery: Low Stability User Persona Cohort
    const sessions = await prisma.workflowSession.findMany({
      where: { projectId, status: 'FAILED' }
    });

    const personaFails: Record<string, number> = {};
    for (const s of sessions) {
      if (s.persona) {
        personaFails[s.persona] = (personaFails[s.persona] || 0) + 1;
      }
    }

    for (const [persona, count] of Object.entries(personaFails)) {
      if (count > 2) {
        await saveDiscovery(
          'PERSONA',
          `Friction cohort discovered: ${persona}`,
          `Multiple session drop-offs detected for user persona "${persona}" (${count} failed attempts).`,
          0.85
        );
      }
    }

    return discovered;
  }
}
