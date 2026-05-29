import { prisma } from '@fricta/db';
import { MentionManager } from '../mentions';

export interface CreateThreadDto {
  projectId: string;
  title: string;
  workflowSessionId?: string;
  uxFindingId?: string;
}

export interface AddCommentDto {
  threadId: string;
  stepIndex: number;
  author: string;
  content: string;
  x?: number;
  y?: number;
}

export class ThreadManager {
  /**
   * Creates a new investigation thread (war-room) for a specific UX finding or session.
   */
  static async createThread(dto: CreateThreadDto): Promise<any> {
    const thread = await prisma.investigationThread.create({
      data: {
        projectId: dto.projectId,
        title: dto.title,
        workflowSessionId: dto.workflowSessionId || null,
        uxFindingId: dto.uxFindingId || null,
        status: 'ACTIVE',
      },
    });

    await prisma.collaborationEvent.create({
      data: {
        projectId: dto.projectId,
        roomType: 'INVESTIGATION',
        roomId: thread.id,
        userEmail: 'system@fricta.internal',
        actionType: 'JOINED',
        payload: {
          threadTitle: dto.title,
          workflowSessionId: dto.workflowSessionId,
        },
      },
    });

    return thread;
  }

  /**
   * Adds an annotation / comment linked to a specific step in the replay timeline.
   * Also parses @mentions and records them.
   */
  static async addAnnotation(dto: AddCommentDto): Promise<any> {
    const annotation = await prisma.replayAnnotation.create({
      data: {
        threadId: dto.threadId,
        stepIndex: dto.stepIndex,
        author: dto.author,
        content: dto.content,
        x: dto.x ?? null,
        y: dto.y ?? null,
      },
    });

    // Check if there are @mentions in the content, e.g. "@alice look at this"
    const mentionRegex = /@(\w+)/g;
    let match;
    const mentions: string[] = [];
    while ((match = mentionRegex.exec(dto.content)) !== null) {
      mentions.push(match[1]);
    }

    for (const username of mentions) {
      await MentionManager.recordMention({
        threadId: dto.threadId,
        mentionedUser: username,
        author: dto.author,
        content: dto.content,
      });
    }

    // Update the thread updatedAt timestamp
    await prisma.investigationThread.update({
      where: { id: dto.threadId },
      data: { updatedAt: new Date() },
    });

    // Record collaboration event
    const thread = await prisma.investigationThread.findUnique({
      where: { id: dto.threadId },
      select: { projectId: true },
    });

    if (thread) {
      await prisma.collaborationEvent.create({
        data: {
          projectId: thread.projectId,
          roomType: 'INVESTIGATION',
          roomId: dto.threadId,
          userEmail: dto.author,
          actionType: 'ANNOTATED',
          payload: {
            stepIndex: dto.stepIndex,
            contentPreview: dto.content.substring(0, 50),
          },
        },
      });
    }

    return annotation;
  }

  /**
   * Retrieves investigation threads for a project.
   */
  static async getThreads(projectId: string): Promise<any[]> {
    return prisma.investigationThread.findMany({
      where: { projectId },
      include: {
        annotations: {
          orderBy: { timestamp: 'asc' },
        },
        mentions: true,
        workflowSession: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Resolves an investigation thread.
   */
  static async resolveThread(threadId: string): Promise<any> {
    const thread = await prisma.investigationThread.update({
      where: { id: threadId },
      data: {
        status: 'RESOLVED',
        updatedAt: new Date(),
      },
    });

    await prisma.collaborationEvent.create({
      data: {
        projectId: thread.projectId,
        roomType: 'INVESTIGATION',
        roomId: thread.id,
        userEmail: 'system@fricta.internal',
        actionType: 'ESCALATED',
        payload: {
          resolved: true,
        },
      },
    });

    return thread;
  }
}
