import { prisma } from '@fricta/db';
import { DeploymentOrchestrator } from '../deployments';

export class NetlifyConnector {
  /**
   * Parse a Netlify deploy webhook payload and map to a DeploymentRun.
   */
  static async handleWebhook(projectId: string, payload: any): Promise<any> {
    const { id: deployId, url, site_name, branch, commit_ref } = payload;
    const isProduction = payload.context === 'production';
    const environment = isProduction ? 'production' : 'preview';

    const run = await DeploymentOrchestrator.createDeploymentRun(projectId, {
      commitHash: commit_ref || 'unknown',
      branch: branch || 'main',
      environment,
      deploymentUrl: url || null,
      provider: 'NETLIFY',
      metadata: {
        netlifyDeployId: deployId,
        siteName: site_name,
        context: payload.context,
        commitMessage: payload.commit_title || null
      }
    });

    if (environment === 'preview' && url) {
      await prisma.previewEnvironment.create({
        data: {
          deploymentRunId: run.id,
          provider: 'NETLIFY',
          url,
          branch: branch || 'main',
          prNumber: payload.review_id || null,
          isTemporary: true,
          status: 'ACTIVE'
        }
      });
    }

    return run;
  }
}
