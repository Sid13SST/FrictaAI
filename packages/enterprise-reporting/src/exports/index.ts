import { PrismaClient, ReportExport } from '@fricta/db';
import { RealtimeEventBus } from '@fricta/realtime';
import { PDFLayoutEngine } from '../pdf';

export type HtmlToPdfRenderer = (html: string) => Promise<Buffer>;

export interface ExportStorage {
  /** Persists a generated file and returns a servable relative path (e.g. `exports/<id>.pdf`). */
  save(fileName: string, data: Buffer): Promise<string>;
}

export class ExportProcessingService {
  private prisma: PrismaClient;
  private renderPdf?: HtmlToPdfRenderer;
  private storage?: ExportStorage;

  constructor(prisma: PrismaClient, options?: { renderPdf?: HtmlToPdfRenderer; storage?: ExportStorage }) {
    this.prisma = prisma;
    this.renderPdf = options?.renderPdf;
    this.storage = options?.storage;
  }

  /**
   * Triggers a new export job and returns the created export record.
   * PDF exports are rendered synchronously (in the background) from the
   * report's real compiled layout via an injected headless-browser renderer.
   * Other formats fall back to a simulated pipeline until a real renderer exists.
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

    const canRenderReal = format === 'PDF' && this.renderPdf && this.storage;

    const run = canRenderReal
      ? () => this.runRealPdfExport(exportRecord.id, reportId)
      : () => this.runSimulatedExport(exportRecord.id, format);

    // Run in the background so triggerExport returns immediately with a PENDING record.
    setTimeout(() => {
      run().catch(async (err) => {
        console.error(`Export background task failed for ${exportRecord.id}:`, err);
        await this.prisma.reportExport.update({
          where: { id: exportRecord.id },
          data: { status: 'FAILED' }
        }).catch(() => {});
      });
    }, 100);

    return exportRecord;
  }

  private async publishProgress(exportId: string, payload: Record<string, unknown>) {
    RealtimeEventBus.getInstance().publish({
      orchestrationSessionId: exportId,
      eventType: 'workspace.exports.progress',
      payload: { id: exportId, ...payload }
    });
  }

  private async runRealPdfExport(exportId: string, reportId: string) {
    await this.prisma.reportExport.update({ where: { id: exportId }, data: { status: 'GENERATING' } });
    await this.publishProgress(exportId, { status: 'GENERATING' });

    const report = await this.prisma.executiveReport.findUnique({ where: { id: reportId } });
    if (!report) throw new Error(`Report ${reportId} not found`);

    const layout = PDFLayoutEngine.compilePDFLayout(report as any);
    const html = PDFLayoutEngine.renderHTML(layout);
    const pdfBuffer = await this.renderPdf!(html);

    const fileName = `${exportId}.pdf`;
    const filePath = await this.storage!.save(fileName, pdfBuffer);

    // Count actual rendered PDF pages from the binary (each page has a /Type /Page object).
    const pageMatches = pdfBuffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g);
    const pageCount = pageMatches ? pageMatches.length : layout.totalPages;

    await this.prisma.reportExport.update({
      where: { id: exportId },
      data: {
        status: 'COMPLETED',
        filePath,
        metadata: {
          sizeBytes: pdfBuffer.length,
          pageCount,
          generatedAt: new Date().toISOString()
        }
      }
    });

    await this.publishProgress(exportId, { status: 'COMPLETED', filePath });
  }

  private async runSimulatedExport(exportId: string, format: string) {
    await this.prisma.reportExport.update({ where: { id: exportId }, data: { status: 'GENERATING' } });
    await this.publishProgress(exportId, { status: 'GENERATING' });

    await new Promise(resolve => setTimeout(resolve, 1500));

    await this.prisma.reportExport.update({
      where: { id: exportId },
      data: { status: 'FAILED', metadata: { reason: `${format} export is not yet implemented` } }
    });
    await this.publishProgress(exportId, { status: 'FAILED' });
  }
}
