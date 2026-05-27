import { prisma } from '@fricta/db';
import { ReplayAuditPayload, InvestigationAuditPayload } from '../types';

export class TraceabilityService {
  /**
   * Tracks a read/export/share access log on sensitive replay workflow session recordings.
   */
  static async traceReplayAccess(payload: ReplayAuditPayload) {
    // Add ReplayAuditLog entry
    const log = await prisma.replayAuditLog.create({
      data: {
        workspaceId: payload.workspaceId || null,
        workflowSessionId: payload.workflowSessionId,
        userId: payload.userId || null,
        action: payload.action,
        description: payload.description,
        metadata: payload.metadata ? (payload.metadata as any) : undefined
      }
    });

    // Write general AccessTraceRecord
    await prisma.accessTraceRecord.create({
      data: {
        workspaceId: payload.workspaceId || null,
        userId: payload.userId || null,
        resourceType: 'REPLAY',
        resourceId: payload.workflowSessionId,
        ipAddress: payload.metadata?.ipAddress || null,
        userAgent: payload.metadata?.userAgent || null
      }
    });

    return log;
  }

  /**
   * Tracks operations made to shared workspace investigations (comments, metadata changes).
   */
  static async traceInvestigationAccess(payload: InvestigationAuditPayload) {
    return prisma.investigationAuditLog.create({
      data: {
        workspaceId: payload.workspaceId || null,
        sharedInvestigationId: payload.sharedInvestigationId,
        userId: payload.userId || null,
        action: payload.action,
        description: payload.description,
        metadata: payload.metadata ? (payload.metadata as any) : undefined
      }
    });
  }

  /**
   * Evaluates how specific stability scores and recommendations are linked to visual/telemetry evidence.
   */
  static async traceEvidenceLineage(resourceType: 'REPORT' | 'SESSION', resourceId: string) {
    if (resourceType === 'REPORT') {
      const links = await prisma.reportEvidenceLink.findMany({
        where: { reportId: resourceId }
      });
      return {
        resourceType,
        resourceId,
        evidenceType: 'MULTIPART_REPORT_LINKS',
        evidenceCount: links.length,
        evidence: links.map(l => ({
          type: l.evidenceType,
          id: l.evidenceId,
          notes: l.notes
        }))
      };
    } else {
      // Replays/Sessions
      const session = await prisma.workflowSession.findUnique({
        where: { id: resourceId },
        include: {
          scores: true,
          cognitiveSignals: true,
          uxFindings: true,
          workflowScreenshots: true
        }
      });
      if (!session) return null;

      return {
        resourceType,
        resourceId,
        clarityScore: session.scores[0]?.clarityScore || 80,
        signalsCount: session.cognitiveSignals.length,
        findingsCount: session.uxFindings.length,
        screenshotsCount: session.workflowScreenshots.length,
        evidenceHashes: session.uxFindings.map(f => ({
          findingId: f.id,
          title: f.title,
          hash: f.evidence
        }))
      };
    }
  }

  /**
   * Chronological audit log details for a session.
   */
  static async getReplayAuditTrail(workflowSessionId: string) {
    return prisma.replayAuditLog.findMany({
      where: { workflowSessionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Retrieves active workspace access logs.
   */
  static async getAccessLogs(workspaceId?: string | null, limit = 50) {
    return prisma.accessTraceRecord.findMany({
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
      orderBy: { accessedAt: 'desc' },
      take: limit
    });
  }
}
