import { prisma } from '@fricta/db';

export class CiIntelligenceEngine {
  /**
   * Record a new ReplayExecution triggered in a CI build pipeline.
   */
  static async startReplayExecution(
    deploymentRunId: string,
    workflowPath: string
  ): Promise<any> {
    const exec = await prisma.replayExecution.create({
      data: {
        deploymentRunId,
        workflowPath,
        status: 'RUNNING'
      }
    });

    await prisma.releaseTimelineEvent.create({
      data: {
        deploymentRunId,
        eventType: 'REPLAY_START',
        eventTitle: 'CI Replay Started',
        description: `Running automated workflow replay for path: ${workflowPath}`
      }
    });

    return exec;
  }

  /**
   * Complete a ReplayExecution, logging metrics and mapping to the generated session.
   */
  static async completeReplayExecution(
    id: string,
    metrics: {
      workflowSessionId?: string;
      survivabilityRate: number;
      cognitiveLoad: number;
      frictionScore: number;
      stepsCompleted: number;
      errorMessage?: string;
    }
  ): Promise<any> {
    const status = metrics.errorMessage ? 'FAILED' : 'COMPLETED';

    const exec = await prisma.replayExecution.update({
      where: { id },
      data: {
        status,
        workflowSessionId: metrics.workflowSessionId || null,
        survivabilityRate: metrics.survivabilityRate,
        cognitiveLoad: metrics.cognitiveLoad,
        frictionScore: metrics.frictionScore,
        stepsCompleted: metrics.stepsCompleted,
        errorMessage: metrics.errorMessage || null,
        updatedAt: new Date()
      },
      include: {
        deploymentRun: true
      }
    });

    await prisma.releaseTimelineEvent.create({
      data: {
        deploymentRunId: exec.deploymentRunId,
        eventType: 'REPLAY_SUCCESS',
        eventTitle: `CI Replay ${status}`,
        description: status === 'COMPLETED' 
          ? `Workflow path ${exec.workflowPath} passed. Survivability: ${metrics.survivabilityRate}% | Cognitive Load: ${metrics.cognitiveLoad}%`
          : `Workflow path ${exec.workflowPath} failed: ${metrics.errorMessage}`
      }
    });

    return exec;
  }
}
