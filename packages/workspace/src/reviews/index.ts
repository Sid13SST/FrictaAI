import { PrismaClient } from '@fricta/db';

export class ReviewManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Assigns or re-assigns an investigation review to an enterprise team member.
   */
  async assignReview(workflowSessionId: string, assignedToId: string | null) {
    const existing = await this.prisma.investigationReview.findFirst({
      where: { workflowSessionId },
    });

    if (existing) {
      return this.prisma.investigationReview.update({
        where: { id: existing.id },
        data: { assignedToId },
      });
    }

    return this.prisma.investigationReview.create({
      data: {
        workflowSessionId,
        assignedToId,
        status: 'PENDING',
      },
    });
  }

  /**
   * Transitions the status of a review.
   */
  async updateReviewStatus(workflowSessionId: string, status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'RESOLVED', approvalNotes?: string) {
    const existing = await this.prisma.investigationReview.findFirst({
      where: { workflowSessionId },
    });

    if (existing) {
      return this.prisma.investigationReview.update({
        where: { id: existing.id },
        data: {
          status,
          approvalNotes: approvalNotes !== undefined ? approvalNotes : existing.approvalNotes,
        },
      });
    }

    return this.prisma.investigationReview.create({
      data: {
        workflowSessionId,
        status,
        approvalNotes,
      },
    });
  }

  /**
   * Retrieves the review state for a single workflow session.
   */
  async getSessionReview(workflowSessionId: string) {
    return this.prisma.investigationReview.findFirst({
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
  }

  /**
   * Retrieves all reviews scoped to a project.
   */
  async getReviewQueue(projectId: string) {
    return this.prisma.investigationReview.findMany({
      where: {
        workflowSession: {
          projectId,
        },
      },
      include: {
        workflowSession: {
          select: {
            id: true,
            goal: true,
            persona: true,
            status: true,
            createdAt: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
