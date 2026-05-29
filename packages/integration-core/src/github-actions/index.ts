import { prisma } from '@fricta/db';
import { DeploymentOrchestrator } from '../deployments';

export class GitHubActionsConnector {
  /**
   * Process a GitHub Actions workflow_run webhook event.
   */
  static async handleWorkflowWebhook(projectId: string, payload: any): Promise<any> {
    const { workflow_run } = payload;
    if (!workflow_run) return null;

    const commitHash = workflow_run.head_sha;
    const branch = workflow_run.head_branch;
    const environment = branch === 'main' ? 'production' : 'preview';
    const status = workflow_run.status === 'completed' ? 'COMPLETED' : 'RUNNING';

    const run = await DeploymentOrchestrator.createDeploymentRun(projectId, {
      commitHash,
      branch,
      environment,
      deploymentUrl: workflow_run.html_url || null,
      provider: 'GITHUB_ACTIONS',
      metadata: {
        runId: workflow_run.id,
        runNumber: workflow_run.run_number,
        actor: workflow_run.actor?.login,
        commitMessage: workflow_run.head_commit?.message
      }
    });

    await prisma.buildCorrelation.create({
      data: {
        deploymentRunId: run.id,
        buildId: String(workflow_run.id),
        jobId: String(workflow_run.run_number),
        commitMessage: workflow_run.head_commit?.message || null,
        author: workflow_run.actor?.login || null,
        logUrl: workflow_run.html_url || null
      }
    });

    return run;
  }
}
