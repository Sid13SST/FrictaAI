import { PrismaClient } from '@fricta/db';

export class GovernanceManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Approves an investigation session, verifying its findings.
   */
  async approveInvestigation(workflowSessionId: string, reviewerUserId: string, notes?: string) {
    const existing = await this.prisma.investigationReview.findFirst({
      where: { workflowSessionId }
    });

    if (existing) {
      return this.prisma.investigationReview.update({
        where: { id: existing.id },
        data: {
          status: 'APPROVED',
          approvalNotes: notes || 'Approved after team review.',
          assignedToId: reviewerUserId,
        },
      });
    }

    return this.prisma.investigationReview.create({
      data: {
        workflowSessionId,
        assignedToId: reviewerUserId,
        status: 'APPROVED',
        approvalNotes: notes || 'Approved after team review.',
      },
    });
  }

  /**
   * Rejects an investigation, requesting more runs or evidence.
   */
  async rejectInvestigation(workflowSessionId: string, reviewerUserId: string, notes?: string) {
    const existing = await this.prisma.investigationReview.findFirst({
      where: { workflowSessionId }
    });

    if (existing) {
      return this.prisma.investigationReview.update({
        where: { id: existing.id },
        data: {
          status: 'REJECTED',
          approvalNotes: notes || 'Rejected: Requires further evidence collection.',
          assignedToId: reviewerUserId,
        },
      });
    }

    return this.prisma.investigationReview.create({
      data: {
        workflowSessionId,
        assignedToId: reviewerUserId,
        status: 'REJECTED',
        approvalNotes: notes || 'Rejected: Requires further evidence collection.',
      },
    });
  }

  /**
   * Resolves the findings, indicating fixes have been deployed.
   */
  async resolveInvestigation(workflowSessionId: string, investigatorUserId: string, notes?: string) {
    const existing = await this.prisma.investigationReview.findFirst({
      where: { workflowSessionId }
    });

    if (existing) {
      return this.prisma.investigationReview.update({
        where: { id: existing.id },
        data: {
          status: 'RESOLVED',
          approvalNotes: notes || 'Resolved: UX issue addressed in code/design.',
          assignedToId: investigatorUserId,
        },
      });
    }

    return this.prisma.investigationReview.create({
      data: {
        workflowSessionId,
        assignedToId: investigatorUserId,
        status: 'RESOLVED',
        approvalNotes: notes || 'Resolved: UX issue addressed in code/design.',
      },
    });
  }

  /**
   * Fetches the current governance verification profile of a session.
   */
  async getGovernanceState(workflowSessionId: string) {
    const review = await this.prisma.investigationReview.findFirst({
      where: { workflowSessionId },
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    const isVerified = review?.status === 'APPROVED' || review?.status === 'RESOLVED';

    return {
      workflowSessionId,
      status: review?.status || 'UNREVIEWED',
      approvalNotes: review?.approvalNotes || null,
      reviewer: review?.assignedTo || null,
      isVerified,
      updatedAt: review?.updatedAt || null,
    };
  }
}
