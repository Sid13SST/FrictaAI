import { PrismaClient } from '@fricta/db';

export class AnnotationManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Adds a new structured annotation linked to a project resource.
   */
  async createAnnotation(params: {
    projectId: string;
    targetType: 'SCREENSHOT' | 'TIMELINE_EVENT' | 'FINDING' | 'TREND' | 'HEATMAP';
    targetId: string;
    content: string;
    createdById: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    title?: string;
  }) {
    return this.prisma.annotation.create({
      data: {
        projectId: params.projectId,
        targetType: params.targetType,
        targetId: params.targetId,
        content: params.content,
        createdById: params.createdById,
        severity: params.severity || null,
        title: params.title || null,
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
   * Gets annotations registered to a specific resource (e.g. a particular finding ID).
   */
  async getAnnotationsForTarget(targetType: string, targetId: string) {
    return this.prisma.annotation.findMany({
      where: { targetType, targetId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        comments: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Fetches all annotations within a project.
   */
  async getAnnotationsForProject(projectId: string) {
    return this.prisma.annotation.findMany({
      where: { projectId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        comments: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Resolves or unresolves an annotation.
   */
  async resolveAnnotation(annotationId: string, resolved: boolean = true) {
    return this.prisma.annotation.update({
      where: { id: annotationId },
      data: { resolved },
    });
  }
}
