import { PrismaClient } from '@fricta/db';
import { logger } from '@fricta/shared';

export class HistoricalMemoryManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Aggregates all session data for a specific project.
   */
  async getProjectSessions(projectId: string) {
    logger.info({ projectId }, 'HistoricalMemoryManager gathering sessions');
    
    const sessions = await this.prisma.workflowSession.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      include: {
        metrics: true,
        uxFindings: true,
        cognitiveSignals: true,
        orchestrationSessions: {
          include: {
            agentExecutions: {
              include: {
                findings: true,
                signals: true,
                reasoningTraces: true
              }
            }
          }
        }
      }
    });

    return sessions;
  }
}
