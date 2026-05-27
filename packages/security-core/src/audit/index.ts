import { prisma } from '@fricta/db';
import { AuditLogPayload } from '../types';

export class AuditLoggingService {
  /**
   * Logs a general organizational or workspace audit event.
   */
  static async logAuditEvent(payload: AuditLogPayload) {
    const event = await prisma.auditEvent.create({
      data: {
        workspaceId: payload.workspaceId || null,
        userId: payload.userId || null,
        action: payload.action,
        resource: payload.resource,
        resourceId: payload.resourceId || null,
        description: payload.description,
        metadata: payload.metadata ? (payload.metadata as any) : undefined
      }
    });

    // Mirror to standard activity events for retro-compatibility
    if (payload.userId) {
      await prisma.activityEvent.create({
        data: {
          workspaceId: payload.workspaceId || null,
          userId: payload.userId,
          actionType: payload.action,
          description: payload.description,
          metadata: payload.metadata ? (payload.metadata as any) : undefined
        }
      });
    }

    return event;
  }

  /**
   * Retrieves chronological audit logs for a workspace or project.
   */
  static async getAuditTimeline(workspaceId?: string | null, limit = 50) {
    return prisma.auditEvent.findMany({
      where: workspaceId ? { workspaceId } : { workspaceId: null },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
}
