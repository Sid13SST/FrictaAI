import { PrismaClient } from '@fricta/db';

export class EvidenceLinkManager {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Links a list of evidence items to an executive report.
   */
  async linkEvidence(reportId: string, links: Array<{ type: string; id: string; notes?: string }>): Promise<any[]> {
    const createdLinks = await Promise.all(
      links.map(async (link) => {
        return this.prisma.reportEvidenceLink.create({
          data: {
            reportId,
            evidenceType: link.type,
            evidenceId: link.id,
            notes: link.notes || null
          }
        });
      })
    );

    return createdLinks;
  }

  /**
   * Retrieves all linked evidence records, including details where available.
   */
  async getLinkedEvidence(reportId: string): Promise<any[]> {
    const links = await this.prisma.reportEvidenceLink.findMany({
      where: { reportId }
    });

    const fullEvidence = await Promise.all(
      links.map(async (link: any) => {
        let details: any = null;

        try {
          if (link.evidenceType === 'SCREENSHOT') {
            details = await this.prisma.workflowScreenshot.findUnique({
              where: { id: link.evidenceId }
            });
          } else if (link.evidenceType === 'COGNITIVE_SIGNAL') {
            details = await this.prisma.cognitiveSignal.findUnique({
              where: { id: link.evidenceId }
            });
          } else if (link.evidenceType === 'PREDICTIVE_RISK') {
            details = await this.prisma.predictiveRiskSignal.findUnique({
              where: { id: link.evidenceId }
            });
          } else if (link.evidenceType === 'TIMELINE_EVENT') {
            details = await this.prisma.screenshotTimelineEvent.findUnique({
              where: { id: link.evidenceId }
            });
          }
        } catch (err) {
          console.warn(`Failed to resolve details for evidence link ${link.id}:`, err);
        }

        return {
          ...link,
          details
        };
      })
    );

    return fullEvidence;
  }
}
