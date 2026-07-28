import { UnifiedUXReportPayload, ExecutiveSummaryPayload } from './types';

function escapeHtml(input: unknown): string {
  const s = String(input ?? '');
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#7342e2',
};

/**
 * Renders the unified UX report as a standalone, print-ready HTML document.
 * Consumed by the backend PDF export route via headless-browser print-to-PDF.
 */
export class PDFRenderer {
  static renderHTML(report: UnifiedUXReportPayload, executive: ExecutiveSummaryPayload): string {
    const { session, scores } = report;
    const duration = session.startedAt && session.endedAt
      ? `${((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000).toFixed(1)}s`
      : 'Unknown';

    const sortedFindings = [...report.uxFindings].sort((a, b) => {
      const priority: Record<string, number> = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
      return (priority[a.severity] || 5) - (priority[b.severity] || 5);
    });

    const findingsHtml = sortedFindings.length === 0
      ? '<p class="muted">No major behavioral UX issues detected.</p>'
      : sortedFindings.map((f, idx) => `
        <div class="finding" style="border-left-color:${SEVERITY_COLORS[f.severity] || '#7342e2'}">
          <div class="finding-head">
            <span class="badge" style="background:${SEVERITY_COLORS[f.severity] || '#7342e2'}22;color:${SEVERITY_COLORS[f.severity] || '#7342e2'}">${escapeHtml(f.severity)}</span>
            <span class="finding-title">${idx + 1}. ${escapeHtml(f.title)}</span>
          </div>
          <p class="finding-desc">${escapeHtml(f.description)}</p>
          <p class="finding-meta"><strong>Evidence:</strong> ${escapeHtml(f.evidence)}</p>
          <p class="finding-rec"><strong>Recommendation:</strong> ${escapeHtml(f.recommendation)}</p>
        </div>
      `).join('');

    const insightsHtml = executive.synthesizedInsights.map((i) => `<li>${escapeHtml(i)}</li>`).join('');

    const personasHtml = report.personaProfiles.length === 0
      ? '<p class="muted">No persona profiles simulated.</p>'
      : `<table class="table"><thead><tr><th>Persona</th><th>Guidance Dependency</th><th>Patience</th><th>Comfort w/ IA</th></tr></thead><tbody>${
          report.personaProfiles.map((p) => `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.traits.guidanceDependency)}</td><td>${escapeHtml(p.traits.patience)}</td><td>${escapeHtml(p.traits.comfortWithIA)}</td></tr>`).join('')
        }</tbody></table>`;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Fricta UX Intelligence Report — ${escapeHtml(session.id)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', -apple-system, Helvetica, Arial, sans-serif; color: #18181b; margin: 0; padding: 40px 48px; font-size: 12px; line-height: 1.55; }
  h1 { font-size: 22px; margin: 0 0 4px; color: #18181b; }
  h2 { font-size: 14px; margin: 28px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #7342e2; color: #18181b; text-transform: uppercase; letter-spacing: 0.05em; }
  .subtitle { color: #71717a; font-size: 11px; margin-bottom: 20px; }
  .grade-row { display: flex; align-items: center; gap: 20px; margin: 20px 0; padding: 16px; background: #f4f3ff; border-radius: 10px; }
  .grade-circle { width: 56px; height: 56px; border-radius: 50%; background: #7342e2; color: white; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; }
  .grade-score { font-size: 20px; font-weight: 700; }
  .table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; }
  .table th, .table td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #e4e4e7; font-size: 11px; }
  .table th { color: #71717a; text-transform: uppercase; font-size: 9px; letter-spacing: 0.04em; }
  .finding { border-left: 4px solid #7342e2; background: #fafafa; padding: 10px 14px; border-radius: 6px; margin-bottom: 10px; page-break-inside: avoid; }
  .finding-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .badge { font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; }
  .finding-title { font-weight: 700; font-size: 12px; }
  .finding-desc { margin: 4px 0; color: #3f3f46; }
  .finding-meta, .finding-rec { margin: 2px 0; color: #3f3f46; }
  .muted { color: #a1a1aa; font-style: italic; }
  ul { margin: 6px 0; padding-left: 20px; }
  li { margin-bottom: 4px; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e4e4e7; color: #a1a1aa; font-size: 9px; text-align: center; }
</style>
</head>
<body>
  <h1>Fricta AI — UX Intelligence Report</h1>
  <p class="subtitle">Session ${escapeHtml(session.id)} · Goal: "${escapeHtml(session.goal || 'Not specified')}" · Persona: ${escapeHtml(session.persona || 'Standard')} · Duration: ${escapeHtml(duration)}</p>

  <div class="grade-row">
    <div class="grade-circle">${escapeHtml(executive.overallUXGrade)}</div>
    <div>
      <div class="grade-score">${executive.overallScore}/100 Overall UX Score</div>
      <div class="muted">Onboarding friction: ${escapeHtml(executive.onboardingFrictionLevel)} · Discoverability risk: ${escapeHtml(executive.discoverabilityRiskLevel)}</div>
    </div>
  </div>

  <h2>Severity Breakdown</h2>
  <table class="table">
    <thead><tr><th>Metric</th><th>Score</th></tr></thead>
    <tbody>
      <tr><td>Onboarding</td><td>${scores.onboardingScore}/100</td></tr>
      <tr><td>Clarity</td><td>${scores.clarityScore}/100</td></tr>
      <tr><td>Information Architecture</td><td>${scores.iaScore}/100</td></tr>
      <tr><td>Efficiency</td><td>${scores.efficiencyScore}/100</td></tr>
    </tbody>
  </table>

  <h2>Executive Insights</h2>
  <ul>${insightsHtml || '<li class="muted">No insights synthesized.</li>'}</ul>

  <h2>UX Findings</h2>
  ${findingsHtml}

  <h2>Simulated Persona Performance</h2>
  ${personasHtml}

  <div class="footer">Generated by Fricta AI UX Intelligence Platform · ${new Date().toISOString()}</div>
</body>
</html>`;
  }
}
