import { PrismaClient } from '@fricta/db';

export class CommentManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Adds a threaded comment onto an existing annotation.
   */
  async addComment(annotationId: string, content: string, createdById: string) {
    return this.prisma.evidenceComment.create({
      data: {
        annotationId,
        content,
        createdById,
      },
      include: {
        createdBy: {
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
   * Deletes a comment.
   */
  async deleteComment(commentId: string) {
    return this.prisma.evidenceComment.delete({
      where: { id: commentId },
    });
  }
}
