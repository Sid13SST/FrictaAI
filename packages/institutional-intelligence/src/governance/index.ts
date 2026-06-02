import { prisma } from '@fricta/db';

export class GovernanceWisdomAuditor {
  static async auditGovernanceWisdom(projectId: string) {
    const reviews = await prisma.governancePolicyReview?.findMany({
      where: { projectId }
    }) || [];

    const averageCompliance = reviews.length > 0
      ? reviews.reduce((acc, r) => acc + r.complianceRate, 0) / reviews.length
      : 1.0;

    const complianceAlerts = reviews
      .filter(r => r.complianceRate < 0.85)
      .map(r => `Policy "${r.policyName}" falls below 85% compliance threshold (Current: ${Math.round(r.complianceRate * 100)}%)`);

    return {
      averageCompliance,
      policyCount: reviews.length,
      complianceAlerts,
      isCompliant: averageCompliance >= 0.85
    };
  }
}
