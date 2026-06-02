import { prisma } from '@fricta/db';
import { RelationshipType } from '../types';

export class RelationshipEngine {
  static async syncProjectRelationships(projectId: string) {
    const logs: string[] = [];

    const getEntityId = async (type: string, refId: string): Promise<string | null> => {
      const e = await prisma.knowledgeEntity.findFirst({
        where: { projectId, entityType: type as any, referenceId: refId }
      });
      return e ? e.id : null;
    };

    const upsertRelationship = async (
      sourceId: string,
      targetId: string,
      type: RelationshipType,
      confidence: number,
      description: string,
      evidences: Array<{ type: string; refId: string; description: string }>
    ) => {
      const existing = await prisma.knowledgeRelationship.findFirst({
        where: { projectId, sourceId, targetId, relationshipType: type }
      });

      let relId = '';
      if (existing) {
        const updated = await prisma.knowledgeRelationship.update({
          where: { id: existing.id },
          data: { confidence, description }
        });
        relId = updated.id;
      } else {
        const created = await prisma.knowledgeRelationship.create({
          data: {
            projectId,
            sourceId,
            targetId,
            relationshipType: type,
            confidence,
            description
          }
        });
        relId = created.id;

        await prisma.knowledgeTimeline.create({
          data: {
            projectId,
            entityId: sourceId,
            eventType: 'RELATIONSHIP_CREATED',
            title: `Established ${type} Relation`,
            description: `Connected entities with confidence ${(confidence * 100).toFixed(0)}%.`
          }
        }).catch(() => {});
      }

      await prisma.evidenceLink.deleteMany({ where: { relationshipId: relId } }).catch(() => {});
      for (const ev of evidences) {
        await prisma.evidenceLink.create({
          data: {
            relationshipId: relId,
            evidenceType: ev.type,
            referenceId: ev.refId,
            description: ev.description
          }
        });
      }
    };

    // 1. Mappings: INITIATIVE -> OBJECTIVE (Supports)
    const initiatives = await prisma.productInitiative.findMany({
      where: { projectId, NOT: { objectiveId: null } }
    });

    for (const init of initiatives) {
      if (!init.objectiveId) continue;
      const sId = await getEntityId('INITIATIVE', init.id);
      const tId = await getEntityId('OBJECTIVE', init.objectiveId);

      if (sId && tId) {
        await upsertRelationship(sId, tId, 'SUPPORTS', 1.0, `Initiative maps directly to and supports Strategic Objective.`, [
          { type: 'INITIATIVE', refId: init.id, description: `Initiative: "${init.title}"` },
          { type: 'OBJECTIVE', refId: init.objectiveId, description: `Targeting Strategic Objective.` }
        ]);
      }
    }
    logs.push(`Mapped ${initiatives.length} Supports relationships.`);

    // 2. Mappings: DEPENDS_ON between initiatives
    const dependencies = await prisma.dependencyRecord.findMany({
      where: { projectId }
    });

    for (const dep of dependencies) {
      const sId = await getEntityId('INITIATIVE', dep.targetInitiativeId);
      const tId = await getEntityId('INITIATIVE', dep.sourceInitiativeId);

      if (sId && tId) {
        const confidence = dep.dependencyType === 'BLOCKING' ? 1.0 : 0.8;
        await upsertRelationship(
          sId,
          tId,
          'DEPENDS_ON',
          confidence,
          `Roadmap sequence requires dependency resolution (${dep.dependencyType}).`,
          [{ type: 'DEPENDENCY', refId: dep.id, description: `Dependency record (Severity: ${dep.dependencyType}). Propagated risk: ${dep.riskScore}` }]
        );
      }
    }
    logs.push(`Mapped ${dependencies.length} Depends On relationships.`);

    // 3. Mappings: RECOMMENDATION -> targeted evidence types (Derived From)
    const recs = await prisma.executiveRecommendation.findMany({
      where: { projectId },
      include: { evidence: true }
    });

    for (const rec of recs) {
      const sId = await getEntityId('RECOMMENDATION', rec.id);
      if (!sId) continue;

      for (const ev of rec.evidence) {
        let targetType = '';
        if (ev.evidenceType === 'INITIATIVE') targetType = 'INITIATIVE';
        else if (ev.evidenceType === 'KPI') targetType = 'KPI';
        else if (ev.evidenceType === 'OUTCOME') targetType = 'OUTCOME';
        else if (ev.evidenceType === 'UX_ANOMALY') targetType = 'RISK';
        else if (ev.evidenceType === 'REPLAY') targetType = 'REPLAY';
        else if (ev.evidenceType === 'INVESTIGATION') targetType = 'INVESTIGATION';

        if (targetType) {
          const tId = await getEntityId(targetType, ev.referenceId);
          if (tId) {
            await upsertRelationship(
              sId,
              tId,
              'DERIVED_FROM',
              0.95,
              `Recommendation generated based on evidence audit trails: "${ev.description}"`,
              [{ type: ev.evidenceType, refId: ev.referenceId, description: ev.description }]
            );
          }
        }
      }
    }
    logs.push(`Mapped Derived From relationships for Recommendations.`);

    return logs;
  }
}
