import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ExecutiveSummaryEngine, ExportEngine, PDFRenderer, splitVisualFindings, PERSONA_PROFILES_PROVENANCE } from '@fricta/report-engine';

/**
 * Saved-data fixture with the structure of the reviewer's real report on
 * aa2a2cc: 2 steps, score 91, partial visual coverage, no behavioural (UX)
 * findings, 8 visual records (2 high weak_cta, 4 medium vision_finding,
 * 1 vision_summary, 1 vision_unavailable), 3 configured persona rows.
 * Offline rendering only; no provider calls.
 */
const payload = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../fixtures/report-partial-coverage.json'), 'utf8'));
const exec = ExecutiveSummaryEngine.synthesize(payload);

describe('report fixture: 0 behavioural + 6 visual issues + 2 coverage records, partial coverage', () => {
  it('classifies 6 issues and keeps summary/unavailable out of the issue list', () => {
    const v = splitVisualFindings(payload.visualFindings);
    expect(v.issues).toHaveLength(6);
    expect(v.summaries).toHaveLength(1);
    expect(v.unavailable).toHaveLength(1);
    expect(v.issues.slice(0, 2).every((f) => f.findingType === 'weak_cta' && f.severity === 'high')).toBe(true);
  });

  it('executive: HIGH discoverability risk is explained by the weak-CTA issues, not only the coverage note', () => {
    expect(exec.overallUXGrade).toBe('A');
    expect(exec.discoverabilityRiskLevel).toBe('HIGH');
    const ins = exec.synthesizedInsights;
    const weak = ins.filter((i) => /high-severity weak call-to-action/.test(i));
    expect(weak).toHaveLength(1); // grouped, not one per record
    expect(weak[0]).toMatch(/2 high-severity weak call-to-action issues on recorded screenshots: "Primary call-to-action lacks visual prominence"\./);
    expect(ins.some((i) => /^4 further visual issues of medium or lower severity are listed/.test(i))).toBe(true);
    expect(ins.some((i) => /^Visual coverage incomplete/.test(i))).toBe(true);
    expect(ins.join(' ')).not.toMatch(/minimal cognitive friction|vision_summary|vision_unavailable/);
  });

  it('PDF: separate behavioural and visual sections, scoped empty wording, issues with severity and provenance', () => {
    const html = PDFRenderer.renderHTML(payload, exec);
    expect(html).not.toContain('No major behavioral UX issues detected');
    expect(html).toContain('<h2>Behavioural Findings</h2>');
    expect(html).toContain('No behavioural friction was detected in the 2 recorded steps of this session.');
    expect(html).toContain('<h2>Visual &amp; Discoverability Findings</h2>');
    expect(html).toContain('6 visual issues from recorded screenshots.');
    for (let i = 1; i <= 6; i++) expect(html).toContain(`V${i}. `);
    expect(html).not.toContain('V7. ');
    expect((html.match(/>HIGH</g) || []).length).toBe(2);
    expect((html.match(/>MEDIUM</g) || []).length).toBe(4);
    expect(html).toContain('Layout heuristic (deterministic rule on a recorded screenshot)');
    expect(html).toContain('AI vision (model observation on a recorded screenshot)');
    expect(html).toContain('Get started button');
    // Coverage records are shown as coverage, not issues.
    expect(html).toMatch(/Visual review coverage:<\/strong> partial \(incomplete\)/);
    expect(html).toContain('AI vision commentary</strong> (context, not issues)');
    expect(html).toContain('AI vision unavailable</strong> for 1 screenshot');
  });

  it('PDF: tested persona stated; configured profiles labelled as not tested', () => {
    const html = PDFRenderer.renderHTML(payload, exec);
    expect(html).not.toContain('Simulated Persona Performance');
    expect(html).toContain('<strong>Tested in this run:</strong> Tech-Savvy User');
    expect(html).toContain(PERSONA_PROFILES_PROVENANCE);
    expect(html).toContain('<th>Configured profile</th>');
  });

  it('Markdown: same split and provenance', () => {
    const md = ExportEngine.toMarkdown(payload, exec);
    expect(md).toContain('- **Tested Persona**: Tech-Savvy User');
    expect(md).toContain('## Behavioural Findings\n*No behavioural friction was detected in the 2 recorded steps');
    expect(md).toContain('### V6. [MEDIUM]');
    expect(md).not.toContain('### V7.');
    expect(md).toContain('### Visual Review Coverage (not issues)');
    expect(md).toContain('### Configured Persona Profiles (not tested in this run)');
    expect(md).not.toContain('Simulated Persona Performance Projections');
    expect(md).not.toMatch(/\[INFO\]|\[LOW\] AI Visual Feedback/);
  });

  it('PM summary and JSON: high visual issues listed, provenance explicit', () => {
    const pm = ExportEngine.toTextSheet(payload, exec);
    expect(pm).toContain('Tested Persona: Tech-Savvy User');
    expect((pm.match(/- \[HIGH\] Visual \(weak call-to-action\)/g) || []).length).toBe(2);
    expect(pm).not.toContain('Maintain existing workflow routes');
    const json = JSON.parse(ExportEngine.toDeveloperJson(payload, exec));
    expect(json.provenance).toMatchObject({ testedPersona: 'Tech-Savvy User', personaProfiles: PERSONA_PROFILES_PROVENANCE, visualFindings: { issues: 6, coverageRecords: 2 } });
  });

  it('pending and zero-evidence logic is unchanged', () => {
    const pending = { ...payload, analysis: { state: 'pending' }, scores: { ...payload.scores, overallScore: null } };
    const pe = ExecutiveSummaryEngine.synthesize(pending);
    expect(pe.analysisState).toBe('pending');
    expect(pe.synthesizedInsights[0]).toMatch(/^Analysis in progress/);
    expect(pe.synthesizedInsights.join(' ')).not.toMatch(/weak call-to-action|further visual issues/);
    expect(PDFRenderer.renderHTML(pending, pe)).toContain('Pending: analysis still running');
    const none = { ...payload, evidence: { status: 'insufficient', reason: 'no actions' }, scores: { clarityScore: null, onboardingScore: null, iaScore: null, efficiencyScore: null, overallScore: null } };
    const ne = ExecutiveSummaryEngine.synthesize(none);
    expect(ne.synthesizedInsights.join(' ')).toMatch(/^Not scored/);
    expect(ne.synthesizedInsights.join(' ')).not.toMatch(/weak call-to-action/);
  });
});
