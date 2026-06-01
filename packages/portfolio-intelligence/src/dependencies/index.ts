import { prisma } from '@fricta/db';
import { DependencyType } from '../types';

export class DependencyAnalyzer {
  static async createDependency(
    projectId: string,
    sourceInitiativeId: string,
    targetInitiativeId: string,
    dependencyType: DependencyType
  ) {
    const source = await prisma.productInitiative.findUnique({
      where: { id: sourceInitiativeId }
    });

    // Compute base risk score based on source initiative's riskScore
    const baseRisk = source?.riskScore ?? 30.0;
    const modifier = dependencyType === 'BLOCKING' ? 1.5 : dependencyType === 'SEQUENTIAL' ? 1.0 : 0.5;
    const riskScore = Math.min(baseRisk * modifier, 100.0);

    const record = await prisma.dependencyRecord.create({
      data: {
        projectId,
        sourceInitiativeId,
        targetInitiativeId,
        dependencyType,
        riskScore,
        status: 'ACTIVE'
      },
      include: {
        sourceInitiative: true,
        targetInitiative: true
      }
    });

    return record;
  }

  static async getDependencies(projectId: string) {
    return prisma.dependencyRecord.findMany({
      where: { projectId },
      include: {
        sourceInitiative: true,
        targetInitiative: true
      },
      orderBy: { riskScore: 'desc' }
    });
  }

  static async calculatePropagatedRisks(projectId: string) {
    const dependencies = await prisma.dependencyRecord.findMany({
      where: { projectId, status: 'ACTIVE' },
      include: {
        sourceInitiative: true,
        targetInitiative: true
      }
    });

    const results = [];

    for (const dep of dependencies) {
      // Propagation math: if source has high risk (or strategic risks defined), propagate it.
      const sourceRisksCount = await prisma.strategicRisk.count({
        where: { initiativeId: dep.sourceInitiativeId }
      });

      // Composite risk calculation
      let propagated = dep.riskScore;
      if (sourceRisksCount > 0) {
        propagated += sourceRisksCount * 10;
      }

      // Cap at 100
      propagated = Math.min(propagated, 100.0);

      const updated = await prisma.dependencyRecord.update({
        where: { id: dep.id },
        data: { riskScore: propagated },
        include: {
          sourceInitiative: true,
          targetInitiative: true
        }
      });

      results.push(updated);
    }

    return results;
  }
}

// Risk score modifier scaling rules for BLOCKING, SEQUENTIAL, and CONCURRENT flows.
