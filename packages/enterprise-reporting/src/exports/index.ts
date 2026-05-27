import { PrismaClient, ReportExport } from '@prisma/client';
import { RealtimeEventBus } from '@fricta/realtime';

export class ExportProcessingService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Triggers a new export job and returns the created export record.
   */
  async triggerExport(reportId: string, format: string, userId: string): Promise<ReportExport> {
    const exportRecord = await this.prisma.reportExport.create({
      data: {
        reportId,
        format,
        status: 'PENDING',
        createdById: userId
      }
    });

    // Simulate async generation task in background
    setTimeout(async () => {
      try {
        // Step 1: Transition to GENERATING
        await this.prisma.reportExport.update({
          where: { id: exportRecord.id },
          data: { status: 'GENERATING' }
        });

        // Broadcast progress
        RealtimeEventBus.getInstance().publish({
          orchestrationSessionId: exportRecord.id,
          eventType: 'workspace.exports.progress',
          payload: { id: exportRecord.id, status: 'GENERATING' }
        });

        // Small generation delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Step 2: Finalize as COMPLETED
        const filePath = `/exports/${format.toLowerCase()}-${exportRecord.id}.${format === 'ZIP' ? 'zip' : format === 'PDF' ? 'pdf' : 'json'}`;
        await this.prisma.reportExport.update({
          where: { id: exportRecord.id },
          data: {
            status: 'COMPLETED',
            filePath,
            metadata: {
              sizeBytes: 153021,
              pageCount: 3,
              generatedAt: new Date().toISOString()
            }
          }
        });

        // Broadcast success
        RealtimeEventBus.getInstance().publish({
          orchestrationSessionId: exportRecord.id,
          eventType: 'workspace.exports.progress',
          payload: { id: exportRecord.id, status: 'COMPLETED', filePath }
        });

      } catch (err) {
        console.error(`Export background task failed for ${exportRecord.id}:`, err);
        await this.prisma.reportExport.update({
          where: { id: exportRecord.id },
          data: { status: 'FAILED' }
        }).catch(() => {});
      }
    }, 100);

    return exportRecord;
  }
}
