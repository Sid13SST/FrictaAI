import { prisma } from '@fricta/db';

export class PreviewIntelligence {
  /**
   * Register a new preview environment and its deployment relation.
   */
  static async registerPreview(
    deploymentRunId: string,
    provider: 'VERCEL' | 'NETLIFY',
    url: string,
    branch: string,
    prNumber?: string
  ): Promise<any> {
    const preview = await prisma.previewEnvironment.create({
      data: {
        deploymentRunId,
        provider,
        url,
        branch,
        prNumber: prNumber || null,
        isTemporary: true,
        status: 'ACTIVE'
      }
    });

    await prisma.releaseTimelineEvent.create({
      data: {
        deploymentRunId,
        eventType: 'DEPLOY',
        eventTitle: 'Preview Created',
        description: `Preview url mapped: ${url} (Branch: ${branch})`
      }
    });

    return preview;
  }

  /**
   * Fetch all active previews for a project.
   */
  static async getActivePreviews(projectId: string): Promise<any[]> {
    return prisma.previewEnvironment.findMany({
      where: {
        deploymentRun: { projectId },
        status: 'ACTIVE'
      },
      include: {
        deploymentRun: true
      }
    });
  }

  /**
   * Tear down or mark preview as inactive.
   */
  static async teardownPreview(previewId: string): Promise<any> {
    return prisma.previewEnvironment.update({
      where: { id: previewId },
      data: {
        status: 'TEARDOWN',
        updatedAt: new Date()
      }
    });
  }
}
