import { prisma } from '@fricta/db';

export interface RecordMentionDto {
  threadId: string;
  mentionedUser: string;
  author: string;
  content: string;
}

export class MentionManager {
  /**
   * Records a user @mention inside an investigation thread.
   */
  static async recordMention(dto: RecordMentionDto): Promise<any> {
    console.log(`[MentionManager] Registering mention: ${dto.author} mentioned ${dto.mentionedUser}`);
    
    const mention = await prisma.teamMentionEvent.create({
      data: {
        threadId: dto.threadId,
        mentionedUser: dto.mentionedUser,
        author: dto.author,
        content: dto.content,
        read: false,
      },
    });

    // Simulated event notification dispatch
    await prisma.collaborationEvent.create({
      data: {
        projectId: (await prisma.investigationThread.findUnique({
          where: { id: dto.threadId },
          select: { projectId: true },
        }))?.projectId || '',
        roomType: 'INVESTIGATION',
        roomId: dto.threadId,
        userEmail: dto.author,
        actionType: 'ESCALATED',
        payload: {
          mentionId: mention.id,
          mentionedUser: dto.mentionedUser,
        },
      },
    });

    return mention;
  }

  /**
   * Retrieves all mentions for a given user.
   */
  static async getUserMentions(username: string): Promise<any[]> {
    return prisma.teamMentionEvent.findMany({
      where: {
        mentionedUser: username,
      },
      include: {
        thread: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Marks a mention as read.
   */
  static async markAsRead(mentionId: string): Promise<any> {
    return prisma.teamMentionEvent.update({
      where: { id: mentionId },
      data: {
        read: true,
      },
    });
  }
}
