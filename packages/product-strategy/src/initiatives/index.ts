import { prisma } from '@fricta/db';
import type {
  StrategicObjectiveInput,
  ProductInitiativeInput,
  InitiativeEvidenceInput,
  StrategicRiskInput
} from '../types';

export class InitiativeManager {
  static async createStrategicObjective(projectId: string, input: StrategicObjectiveInput) {
    return prisma.strategicObjective.create({
      data: {
        projectId,
        title: input.title,
        description: input.description,
        targetMetric: input.targetMetric,
        targetValue: input.targetValue
      }
    });
  }

  static async createProductInitiative(projectId: string, input: ProductInitiativeInput) {
    return prisma.productInitiative.create({
      data: {
        projectId,
        objectiveId: input.objectiveId || null,
        title: input.title,
        description: input.description,
        owner: input.owner || 'unassigned',
        complexity: input.complexity || 'MEDIUM',
        effortScore: input.effortScore || 5.0,
        status: 'PROPOSED',
        strategicScore: 0.0,
        userImpactScore: 0.0,
        survivabilityScore: 0.0,
        riskScore: 0.0,
        targetQuarter: input.targetQuarter || '2026-Q3'
      }
    });
  }

  static async updateInitiativeStatus(
    initiativeId: string,
    status: string,
    details?: { owner?: string; targetQuarter?: string; complexity?: string; effortScore?: number }
  ) {
    const data: any = { status };
    if (details) {
      if (details.owner !== undefined) data.owner = details.owner;
      if (details.targetQuarter !== undefined) data.targetQuarter = details.targetQuarter;
      if (details.complexity !== undefined) data.complexity = details.complexity;
      if (details.effortScore !== undefined) data.effortScore = details.effortScore;
    }
    return prisma.productInitiative.update({
      where: { id: initiativeId },
      data
    });
  }

  static async createStrategicRisk(initiativeId: string, input: StrategicRiskInput) {
    return prisma.strategicRisk.create({
      data: {
        initiativeId,
        riskType: input.riskType,
        description: input.description,
        severity: input.severity,
        mitigationPlan: input.mitigationPlan
      }
    });
  }

  static async addEvidence(initiativeId: string, input: InitiativeEvidenceInput) {
    return prisma.initiativeEvidence.create({
      data: {
        initiativeId,
        evidenceType: input.evidenceType,
        referenceId: input.referenceId,
        description: input.description,
        metadata: input.metadata || null
      }
    });
  }
}
