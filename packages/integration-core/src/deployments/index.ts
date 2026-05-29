import { prisma } from '@fricta/db';

export interface CreateDeploymentDto {
  commitHash: string;
  branch: string;
  environment: string;
  deploymentUrl: string | null;
  provider: string;
  metadata?: any;
}

export class DeploymentOrchestrator {
  /**
   * Create a new deployment run and record an initial timeline event.
   */
  static async createDeploymentRun(projectId: string, dto: CreateDeploymentDto): Promise<any> {
    const run = await prisma.deploymentRun.create({
      data: {
        projectId,
        commitHash: dto.commitHash,
        branch: dto.branch,
        environment: dto.environment,
        deploymentUrl: dto.deploymentUrl,
        provider: dto.provider,
        status: 'PENDING',
        metadata: dto.metadata || {}
      }
    });

    // Record release timeline event
    await prisma.releaseTimelineEvent.create({
      data: {
        deploymentRunId: run.id,
        eventType: 'DEPLOY',
        eventTitle: `Deploy started on ${dto.environment}`,
        description: `Deployment initiated via ${dto.provider} for branch ${dto.branch} (${dto.commitHash.substring(0, 7)})`
      }
    });

    return run;
  }

  /**
   * Retrieve all deployment runs for a project.
   */
  static async getDeploymentRuns(projectId: string): Promise<any[]> {
    return prisma.deploymentRun.findMany({
      where: { projectId },
      include: {
        previews: true,
        riskSignals: true,
        buildCorrelations: true,
        timelineEvents: { orderBy: { timestamp: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Update the status of a deployment run, computing final metrics.
   */
  static async updateDeploymentStatus(
    runId: string,
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED',
    metrics?: { survivabilityScore?: number; riskLevel?: string }
  ): Promise<any> {
    const run = await prisma.deploymentRun.update({
      where: { id: runId },
      data: {
        status,
        survivabilityScore: metrics?.survivabilityScore,
        riskLevel: metrics?.riskLevel,
        updatedAt: new Date()
      }
    });

    await prisma.releaseTimelineEvent.create({
      data: {
        deploymentRunId: runId,
        eventType: status === 'COMPLETED' ? 'BUILD_SUCCESS' : 'BUILD_START',
        eventTitle: `Deployment ${status}`,
        description: `Deployment marked as ${status}. Survivability score: ${metrics?.survivabilityScore ?? 'N/A'}%`
      }
    });

    return run;
  }
}
