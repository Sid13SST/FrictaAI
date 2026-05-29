import { prisma } from '@fricta/db';
import { DeploymentOrchestrator } from '../deployments';

export class VercelConnector {
  /**
   * Parse an incoming Vercel webhook payload and map to a DeploymentRun.
   */
  static async handleWebhook(projectId: string, payload: any): Promise<any> {
    const { id: deploymentId, url, name, meta } = payload;
    const branch = meta?.githubCommitRef || 'main';
    const commitHash = meta?.githubCommitSha || 'unknown';
    const isProduction = payload.target === 'production';
    const environment = isProduction ? 'production' : 'preview';

    // Create the deployment run
    const run = await DeploymentOrchestrator.createDeploymentRun(projectId, {
      commitHash,
      branch,
      environment,
      deploymentUrl: url ? `https://${url}` : null,
      provider: 'VERCEL',
      metadata: {
        vercelDeploymentId: deploymentId,
        projectName: name,
        creator: payload.creator?.username,
        ...meta
      }
    });

    // If it's a preview deployment, register a PreviewEnvironment
    if (environment === 'preview' && url) {
      await prisma.previewEnvironment.create({
        data: {
          deploymentRunId: run.id,
          provider: 'VERCEL',
          url: `https://${url}`,
          branch,
          prNumber: meta?.githubPullRequestIds || null,
          isTemporary: true,
          status: 'ACTIVE'
        }
      });
    }

    return run;
  }
}
