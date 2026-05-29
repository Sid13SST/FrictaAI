import { prisma } from '@fricta/db';
import { DeploymentOrchestrator } from '../deployments';

export class GitLabCiConnector {
  /**
   * Process GitLab pipeline trigger events.
   */
  static async handlePipelineWebhook(projectId: string, payload: any): Promise<any> {
    const { object_attributes, commit, user } = payload;
    if (!object_attributes) return null;

    const commitHash = commit?.id || 'unknown';
    const branch = object_attributes.ref || 'main';
    const environment = branch === 'main' ? 'production' : 'preview';

    const run = await DeploymentOrchestrator.createDeploymentRun(projectId, {
      commitHash,
      branch,
      environment,
      deploymentUrl: object_attributes.detailed_status?.details_path || null,
      provider: 'GITLAB_CI',
      metadata: {
        pipelineId: object_attributes.id,
        user: user?.username
      }
    });

    await prisma.buildCorrelation.create({
      data: {
        deploymentRunId: run.id,
        buildId: String(object_attributes.id),
        jobId: null,
        commitMessage: commit?.message || null,
        author: user?.username || null,
        logUrl: object_attributes.detailed_status?.details_path || null
      }
    });

    return run;
  }
}
