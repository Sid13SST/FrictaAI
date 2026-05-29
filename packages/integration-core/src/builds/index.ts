import { prisma } from '@fricta/db';

export class BuildCorrelationTracker {
  /**
   * Correlate a deployment run to a pipeline build task.
   */
  static async associateBuild(
    deploymentRunId: string,
    buildInfo: {
      buildId: string;
      jobId?: string;
      commitMessage?: string;
      author?: string;
      duration?: number;
      logUrl?: string;
    }
  ): Promise<any> {
    return prisma.buildCorrelation.create({
      data: {
        deploymentRunId,
        buildId: buildInfo.buildId,
        jobId: buildInfo.jobId || null,
        commitMessage: buildInfo.commitMessage || null,
        author: buildInfo.author || null,
        duration: buildInfo.duration || null,
        logUrl: buildInfo.logUrl || null
      }
    });
  }
}
