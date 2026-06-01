import { prisma } from '@fricta/db';
import { AllocationConfig } from '../types';

export class PortfolioManager {
  static async createPortfolio(
    projectId: string,
    name: string,
    description: string,
    allocations: AllocationConfig[]
  ) {
    const portfolio = await prisma.portfolio.create({
      data: {
        projectId,
        name,
        description,
        status: 'ACTIVE'
      }
    });

    // Create investment allocations
    for (const alloc of allocations) {
      await prisma.investmentAllocation.create({
        data: {
          portfolioId: portfolio.id,
          category: alloc.category,
          percentage: alloc.percentage,
          budgetAmount: alloc.budgetAmount ?? null
        }
      });
    }

    // Add activity log
    const user = await prisma.user.findFirst();
    if (user) {
      await prisma.activityEvent.create({
        data: {
          userId: user.id,
          projectId,
          actionType: 'PORTFOLIO_CREATE',
          description: `Created product portfolio: ${name}`
        }
      }).catch(() => {});
    }

    return portfolio;
  }

  static async allocateInvestments(portfolioId: string, allocations: AllocationConfig[]) {
    // Clear old allocations
    await prisma.investmentAllocation.deleteMany({ where: { portfolioId } });

    const created = [];
    for (const alloc of allocations) {
      const record = await prisma.investmentAllocation.create({
        data: {
          portfolioId,
          category: alloc.category,
          percentage: alloc.percentage,
          budgetAmount: alloc.budgetAmount ?? null
        }
      });
      created.push(record);
    }
    return created;
  }

  static async computePortfolioHealth(projectId: string) {
    // 1. Fetch alignment score
    const alignments = await prisma.alignmentRecord.findMany({
      where: { portfolio: { projectId } }
    });
    
    let alignmentScore = 80.0; // default fallback
    if (alignments.length > 0) {
      const sum = alignments.reduce((acc, r) => acc + r.alignmentScore, 0);
      alignmentScore = sum / alignments.length;
    }

    // 2. Fetch coverage score
    const objectivesCount = await prisma.strategicObjective.count({ where: { projectId } });
    const coveredObjectives = await prisma.strategicObjective.count({
      where: {
        projectId,
        initiatives: { some: {} }
      }
    });
    const coverageScore = objectivesCount > 0 ? (coveredObjectives / objectivesCount) * 100 : 75.0;

    // 3. Fetch risk index
    const dependencies = await prisma.dependencyRecord.findMany({
      where: { projectId, status: 'ACTIVE' }
    });
    let riskIndex = 15.0; // default baseline risk
    if (dependencies.length > 0) {
      const compositeRisk = dependencies.reduce((acc, d) => acc + d.riskScore, 0) / dependencies.length;
      riskIndex = Math.min(compositeRisk * 10, 100.0);
    }

    // 4. Calculate overall rating
    const healthRating = (alignmentScore * 0.4) + (coverageScore * 0.4) + ((100 - riskIndex) * 0.2);

    // Save snapshot
    const snapshot = await prisma.portfolioHealthSnapshot.create({
      data: {
        projectId,
        alignmentScore,
        riskIndex,
        coverageScore,
        healthRating
      }
    });

    return snapshot;
  }

  static async getPortfolioHealth(projectId: string) {
    const snapshots = await prisma.portfolioHealthSnapshot.findMany({
      where: { projectId },
      orderBy: { recordedAt: 'desc' },
      take: 12
    });

    let alignmentSum = 0;
    let riskSum = 0;
    let coverageSum = 0;
    let healthSum = 0;
    const count = snapshots.length;

    for (const snap of snapshots) {
      alignmentSum += snap.alignmentScore;
      riskSum += snap.riskIndex;
      coverageSum += snap.coverageScore;
      healthSum += snap.healthRating;
    }

    return {
      history: snapshots,
      averages: {
        alignmentScore: count > 0 ? alignmentSum / count : 82.5,
        riskIndex: count > 0 ? riskSum / count : 12.4,
        coverageScore: count > 0 ? coverageSum / count : 78.0,
        healthRating: count > 0 ? healthSum / count : 84.5
      }
    };
  }
}
