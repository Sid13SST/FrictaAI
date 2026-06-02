import { prisma } from '@fricta/db';
import { EntityType } from '../types';

export class EntityManager {
  static async syncProjectEntities(projectId: string) {
    const syncLogs: string[] = [];

    const upsertEntity = async (type: EntityType, refId: string, name: string, description?: string | null) => {
      const existing = await prisma.knowledgeEntity.findFirst({
        where: { projectId, entityType: type, referenceId: refId }
      });

      if (existing) {
        await prisma.knowledgeEntity.update({
          where: { id: existing.id },
          data: { name, description }
        });
      } else {
        const created = await prisma.knowledgeEntity.create({
          data: {
            projectId,
            entityType: type,
            referenceId: refId,
            name,
            description
          }
        });
        
        await prisma.knowledgeTimeline.create({
          data: {
            projectId,
            entityId: created.id,
            eventType: 'ENTITY_CREATED',
            title: `Synchronized ${type} Node`,
            description: `Added "${name}" to the organizational intelligence map.`
          }
        }).catch(() => {});
      }
    };

    // 1. Objectives
    const objectives = await prisma.strategicObjective.findMany({ where: { projectId } });
    for (const obj of objectives) {
      await upsertEntity('OBJECTIVE', obj.id, obj.title, obj.description);
    }
    syncLogs.push(`Synced ${objectives.length} Objectives.`);

    // 2. Initiatives
    const initiatives = await prisma.productInitiative.findMany({ where: { projectId } });
    for (const init of initiatives) {
      await upsertEntity('INITIATIVE', init.id, init.title, init.description);
    }
    syncLogs.push(`Synced ${initiatives.length} Initiatives.`);

    // 3. KPIs
    const kpis = await prisma.productKPI.findMany({ where: { projectId } });
    for (const kpi of kpis) {
      await upsertEntity('KPI', kpi.id, kpi.name, `Metric key: ${kpi.metricKey}. Value: ${kpi.currentValue}`);
    }
    syncLogs.push(`Synced ${kpis.length} KPIs.`);

    // 4. Outcomes
    const outcomes = await prisma.productOutcome.findMany({ where: { projectId } });
    for (const out of outcomes) {
      await upsertEntity('OUTCOME', out.id, out.title, `Success verdict: ${out.verdict}. Description: ${out.description}`);
    }
    syncLogs.push(`Synced ${outcomes.length} Outcomes.`);

    // 5. Recommendations
    const recommendations = await prisma.executiveRecommendation.findMany({ where: { projectId } });
    for (const rec of recommendations) {
      await upsertEntity('RECOMMENDATION', rec.id, rec.title, rec.description);
    }
    syncLogs.push(`Synced ${recommendations.length} Recommendations.`);

    // 6. Investigations
    const threads = await prisma.investigationThread.findMany({ where: { projectId } });
    for (const th of threads) {
      await upsertEntity('INVESTIGATION', th.id, th.title, 'Strategic investigation thread.');
    }
    syncLogs.push(`Synced ${threads.length} Investigations.`);

    // 7. Replays
    const sessions = await prisma.workflowSession.findMany({ where: { projectId } });
    for (const s of sessions) {
      await upsertEntity('REPLAY', s.id, `User Replay Session (ID: ${s.id.substring(0, 8)})`, `Persona: ${s.persona || 'Unknown'}. Status: ${s.status}. Steps: ${s.stepCount}`);
    }
    syncLogs.push(`Synced ${sessions.length} Replays.`);

    // 8. Risks
    const risks = await prisma.strategicRiskRecord.findMany({ where: { projectId } });
    for (const r of risks) {
      await upsertEntity('RISK', r.id, r.title, r.description);
    }
    syncLogs.push(`Synced ${risks.length} Risks.`);

    // 9. Governance Policy Reviews
    const govReviews = await prisma.governancePolicyReview.findMany({ where: { projectId } });
    for (const gr of govReviews) {
      await upsertEntity('GOVERNANCE_RECORD', gr.id, gr.policyName, `Compliance rate: ${gr.complianceRate}%. Status: ${gr.status}`);
    }
    syncLogs.push(`Synced ${govReviews.length} Governance Records.`);

    return syncLogs;
  }
}
