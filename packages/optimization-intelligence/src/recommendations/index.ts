import { prisma } from '@fricta/db';
import type { ImpactRecord } from '../types';

// ─── Recommendation Tracker ───────────────────────────────────────────────────
// Tracks whether redesign recommendations were adopted and whether
// adoption actually improved measured UX metrics.

export class RecommendationTracker {
  /**
   * Record a new recommendation with PENDING adoption status.
   */
  static async trackAdoption(projectId: string, impact: ImpactRecord) {
    return prisma.recommendationImpact.create({
      data: {
        projectId,
        recommendationType:   impact.recommendationType,
        title:                impact.title,
        description:          impact.description,
        baselineSurvivability: impact.baselineSurvivability,
        baselineFriction:      impact.baselineFriction,
        adoptionStatus:       'PENDING',
        verificationStatus:   'UNVERIFIED',
      },
    });
  }

  /**
   * Mark a recommendation as adopted and capture current metric state.
   */
  static async markAdopted(
    impactId: string,
    currentSurvivability?: number,
    currentFriction?: number
  ) {
    const existing = await prisma.recommendationImpact.findUnique({ where: { id: impactId } });
    if (!existing) throw new Error(`RecommendationImpact ${impactId} not found`);

    const survivabilityDelta = currentSurvivability && existing.baselineSurvivability
      ? currentSurvivability - existing.baselineSurvivability
      : undefined;

    const frictionDelta = currentFriction && existing.baselineFriction
      ? currentFriction - existing.baselineFriction
      : undefined;

    return prisma.recommendationImpact.update({
      where: { id: impactId },
      data: {
        adoptionStatus:       'ADOPTED',
        adoptedAt:            new Date(),
        currentSurvivability,
        currentFriction,
        survivabilityDelta,
        frictionDelta,
      },
    });
  }

  /**
   * Verify the impact of an adopted recommendation.
   * Classifies as VERIFIED_IMPROVED, VERIFIED_NEUTRAL, or VERIFIED_REGRESSED.
   */
  static async verifyImpact(impactId: string) {
    const impact = await prisma.recommendationImpact.findUnique({ where: { id: impactId } });
    if (!impact) throw new Error(`RecommendationImpact ${impactId} not found`);

    let verificationStatus = 'VERIFIED_NEUTRAL';

    const survDelta = impact.survivabilityDelta ?? 0;
    const fricDelta = impact.frictionDelta ?? 0;

    if (survDelta > 0.03 || fricDelta < -0.03) {
      verificationStatus = 'VERIFIED_IMPROVED';
    } else if (survDelta < -0.03 || fricDelta > 0.03) {
      verificationStatus = 'VERIFIED_REGRESSED';
    }

    return prisma.recommendationImpact.update({
      where: { id: impactId },
      data: { verificationStatus, verifiedAt: new Date() },
    });
  }

  /**
   * List all recommendation impacts for a project.
   */
  static async list(projectId: string) {
    return prisma.recommendationImpact.findMany({
      where:   { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
