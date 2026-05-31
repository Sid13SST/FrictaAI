import { prisma } from '@fricta/db';

export class StrategyTimelineManager {
  /**
   * Generates a timeline of strategic actions, objective creation, and evidence links.
   */
  static async getStrategyTimeline(projectId: string) {
    const [objectives, initiatives, evidence] = await Promise.all([
      prisma.strategicObjective.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.productInitiative.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.initiativeEvidence.findMany({
        where: { initiative: { projectId } },
        orderBy: { createdAt: 'desc' },
        include: { initiative: true }
      })
    ]);

    const events: any[] = [];

    for (const obj of objectives) {
      events.push({
        id: `obj-${obj.id}`,
        type: 'OBJECTIVE_CREATED',
        title: `Strategic Objective Added: ${obj.title}`,
        description: `Objective target defined: "${obj.description}". Metric: ${obj.targetMetric || 'none'}.`,
        timestamp: obj.createdAt
      });
    }

    for (const init of initiatives) {
      events.push({
        id: `init-${init.id}`,
        type: 'INITIATIVE_CREATED',
        title: `Initiative Proposed: ${init.title}`,
        description: `Initiative created under status "${init.status}". Owner: ${init.owner || 'unassigned'}.`,
        timestamp: init.createdAt
      });
    }

    for (const ev of evidence) {
      events.push({
        id: `ev-${ev.id}`,
        type: 'EVIDENCE_LINKED',
        title: 'Fricta UX Evidence Linked',
        description: `Added "${ev.description}" (${ev.evidenceType}) to initiative "${ev.initiative.title}".`,
        timestamp: ev.createdAt
      });
    }

    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}
