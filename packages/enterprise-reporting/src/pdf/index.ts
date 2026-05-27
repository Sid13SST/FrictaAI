import { ExecutiveReport } from '@prisma/client';
import { PDFLayoutStructure, PDFLayoutPage } from '../types';

export class PDFLayoutEngine {
  /**
   * Generates a structural PDF layout representation.
   */
  static compilePDFLayout(report: ExecutiveReport & { sections: any }): PDFLayoutStructure {
    const pages: PDFLayoutPage[] = [];

    // Cover Page
    pages.push({
      pageNumber: 1,
      header: 'Fricta Enterprise Intelligence PDF Service',
      footer: 'CONFIDENTIAL - INTERNAL DISTRIBUTION ONLY',
      elements: [
        { type: 'TITLE', value: report.title },
        { type: 'SUBTITLE', value: 'Heuristic Usability Report & Longitudinal Health Audit' },
        { type: 'DATE', value: new Date(report.createdAt).toLocaleDateString() },
        { type: 'METRICS_BLOCK', stabilityScore: report.stabilityScore, completionRate: report.completionRate, riskLevel: report.riskLevel }
      ]
    });

    // Content Pages
    const parsedSections = typeof report.sections === 'string' ? JSON.parse(report.sections) : report.sections;
    if (Array.isArray(parsedSections)) {
      parsedSections.forEach((section: any, idx: number) => {
        pages.push({
          pageNumber: idx + 2,
          header: report.title,
          footer: `CONFIDENTIAL - Page ${idx + 2}`,
          elements: [
            { type: 'SECTION_HEADER', value: section.title },
            { type: 'PARAGRAPH', value: section.content },
            ...(section.metadata ? [{ type: 'DATA_TABLE', data: section.metadata }] : [])
          ]
        });
      });
    }

    return {
      documentTitle: report.title,
      totalPages: pages.length,
      pages
    };
  }
}
