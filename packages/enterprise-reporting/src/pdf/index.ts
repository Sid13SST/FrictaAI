import { ExecutiveReport } from '@fricta/db';
import { PDFLayoutStructure, PDFLayoutPage } from '../types';

function escapeHtml(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderElement(el: any): string {
  switch (el.type) {
    case 'TITLE':
      return `<h1>${escapeHtml(el.value)}</h1>`;
    case 'SUBTITLE':
      return `<p class="subtitle">${escapeHtml(el.value)}</p>`;
    case 'DATE':
      return `<p class="muted">${escapeHtml(el.value)}</p>`;
    case 'METRICS_BLOCK':
      return `<div class="metrics-block">
        <div><span class="metric-label">Stability</span><span class="metric-value">${escapeHtml(el.stabilityScore ?? '—')}</span></div>
        <div><span class="metric-label">Completion Rate</span><span class="metric-value">${escapeHtml(el.completionRate ?? '—')}</span></div>
        <div><span class="metric-label">Risk Level</span><span class="metric-value">${escapeHtml(el.riskLevel ?? '—')}</span></div>
      </div>`;
    case 'SECTION_HEADER':
      return `<h2>${escapeHtml(el.value)}</h2>`;
    case 'PARAGRAPH':
      return `<p class="paragraph">${escapeHtml(el.value)}</p>`;
    case 'DATA_TABLE': {
      const data = el.data && typeof el.data === 'object' ? el.data : {};
      const rows = Object.entries(data).map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`).join('');
      return rows ? `<table class="table"><tbody>${rows}</tbody></table>` : '';
    }
    default:
      return '';
  }
}

export class PDFLayoutEngine {
  /**
   * Renders a compiled PDF layout structure as standalone, print-ready HTML.
   * Consumed by the backend export route via headless-browser print-to-PDF.
   */
  static renderHTML(layout: PDFLayoutStructure): string {
    const pagesHtml = layout.pages.map((page) => `
      <section class="page">
        <div class="page-content">
          ${page.elements.map(renderElement).join('')}
        </div>
        <div class="footer">${escapeHtml(page.footer)} — Page ${page.pageNumber} of ${layout.totalPages}</div>
      </section>
    `).join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(layout.documentTitle)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', -apple-system, Helvetica, Arial, sans-serif; color: #18181b; margin: 0; font-size: 12px; line-height: 1.55; }
  .page { padding: 40px 48px; page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  h1 { font-size: 22px; margin: 0 0 4px; color: #18181b; }
  h2 { font-size: 14px; margin: 20px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #7342e2; color: #18181b; text-transform: uppercase; letter-spacing: 0.05em; }
  .subtitle { color: #71717a; font-size: 12px; margin: 0 0 16px; }
  .muted { color: #a1a1aa; font-size: 11px; }
  .paragraph { color: #3f3f46; margin: 6px 0 14px; }
  .metrics-block { display: flex; gap: 24px; margin: 20px 0; padding: 16px; background: #f4f3ff; border-radius: 10px; }
  .metrics-block > div { display: flex; flex-direction: column; }
  .metric-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; }
  .metric-value { font-size: 18px; font-weight: 700; color: #18181b; }
  .table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; }
  .table td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #e4e4e7; font-size: 11px; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e4e4e7; color: #a1a1aa; font-size: 9px; text-align: center; }
</style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;
  }

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
