import { describe, it, expect } from 'vitest';
import { scoreAudit, calculateScores, GOAL_NOT_REACHED_CAP } from '@fricta/ux-engine';
import { ExecutiveSummaryEngine, ExportEngine, PDFRenderer, computeVisualCoverage, NO_EVIDENCE_LABEL } from '@fricta/report-engine';

const perfect = { clarityScore: 100, efficiencyScore: 100, smoothnessScore: 100 };

function gradeFor(overallScore: number | null) {
  // Same grade bands the report page, exports and PDF use.
  return ExecutiveSummaryEngine.synthesize({
    session: { id: 's', goal: null, persona: null, startedAt: new Date(), endedAt: null, stepCount: 1 },
    scores: { clarityScore: 0, onboardingScore: 0, iaScore: 0, efficiencyScore: 0, overallScore },
    uxFindings: [], cognitiveSignals: [], visualFindings: [], personaProfiles: [],
  }).overallUXGrade;
}

describe('scoreAudit (single source of truth for the report grade)', () => {
  it('a clean, completed run keeps its behavioural score', () => {
    const s = scoreAudit({ actionCount: 3, behavioural: perfect, outcome: 'COMPLETED', uxFindings: [], visualFindings: [] });
    expect(s.overallScore).toBe(100);
    expect(s.goalReached).toBe(true);
    expect(gradeFor(s.overallScore)).toBe('A');
  });

  it('is not 100 when findings exist', () => {
    const s = scoreAudit({ actionCount: 3,
      behavioural: perfect,
      outcome: 'COMPLETED',
      uxFindings: [{ severity: 'MEDIUM' }],
      visualFindings: [{ severity: 'high', findingType: 'weak_cta' }, { severity: 'medium', findingType: 'nav_overload' }],
    });
    expect(s.overallScore).toBeLessThan(100);
    expect(s.breakdown.visualFindingsPenalty).toBe(8);
    expect(s.breakdown.uxFindingsPenalty).toBe(5);
    expect(s.clarityScore).toBe(92);
    expect(s.smoothnessScore).toBe(95);
  });

  it('a run that did not reach its goal is capped into the F band, even with no findings', () => {
    for (const outcome of ['FAILED', 'LOOP_DETECTED', 'TIMEOUT']) {
      const s = scoreAudit({ actionCount: 3, behavioural: perfect, outcome, uxFindings: [], visualFindings: [] });
      expect(s.overallScore).toBe(GOAL_NOT_REACHED_CAP);
      expect(s.goalReached).toBe(false);
      expect(gradeFor(s.overallScore)).toBe('F');
    }
  });

  it('does not cap a run that is still in progress', () => {
    const s = scoreAudit({ actionCount: 3, behavioural: perfect, outcome: 'RUNNING', uxFindings: [], visualFindings: [] });
    expect(s.overallScore).toBe(100);
    expect(s.breakdown.outcomeCap).toBeNull();
  });

  it('ignores vision_summary commentary but counts vision/heuristic defects', () => {
    const s = scoreAudit({ actionCount: 3,
      behavioural: perfect, outcome: 'COMPLETED', uxFindings: [],
      visualFindings: [{ severity: 'low', findingType: 'vision_summary' }, { severity: 'medium', findingType: 'vision_finding' }],
    });
    expect(s.breakdown.visualFindingsPenalty).toBe(3);
  });

  it('caps finding penalties so one noisy analysis cannot zero the score', () => {
    const many = Array.from({ length: 50 }, () => ({ severity: 'CRITICAL' }));
    const vis = Array.from({ length: 50 }, () => ({ severity: 'high', findingType: 'weak_cta' }));
    const s = scoreAudit({ actionCount: 3, behavioural: perfect, outcome: 'COMPLETED', uxFindings: many, visualFindings: vis });
    expect(s.breakdown.uxFindingsPenalty).toBe(40);
    expect(s.breakdown.visualFindingsPenalty).toBe(25);
    expect(s.overallScore).toBe(Math.round(75 * 0.4 + 100 * 0.3 + 60 * 0.3));
  });

  it('builds on calculateScores: behavioural penalties carry through', () => {
    const behavioural = calculateScores(
      [{ signalType: 'REPEATED_ACTION', severity: 'MEDIUM', timestamp: new Date() } as any],
      [],
    );
    expect(behavioural.smoothnessScore).toBe(95);
    const s = scoreAudit({ actionCount: 3, behavioural, outcome: 'COMPLETED', uxFindings: [], visualFindings: [] });
    expect(s.overallScore).toBe(behavioural.overallScore);
  });

  it('no recorded actions = insufficient evidence: every score null, no grade (not 55/F)', () => {
    for (const outcome of ['FAILED', 'TIMEOUT', 'LOOP_DETECTED', 'COMPLETED']) {
      const s = scoreAudit({ actionCount: 0, behavioural: perfect, outcome, uxFindings: [{ severity: 'HIGH' }], visualFindings: [] });
      expect(s.evidence).toBe('insufficient');
      expect([s.overallScore, s.clarityScore, s.efficiencyScore, s.smoothnessScore]).toEqual([null, null, null, null]);
      expect(s.breakdown.behaviouralOverall).toBeNull();
      expect(gradeFor(s.overallScore)).toBe('N/A');
    }
  });

  it('vision_unavailable coverage notes are never penalised as defects', () => {
    const s = scoreAudit({ actionCount: 3, behavioural: perfect, outcome: 'COMPLETED', uxFindings: [],
      visualFindings: [{ severity: 'info', findingType: 'vision_unavailable' }, { severity: 'info', findingType: 'vision_unavailable' }] });
    expect(s.overallScore).toBe(100);
    expect(s.breakdown.visualFindingsPenalty).toBe(0);
  });
});

describe('insufficient evidence in the executive summary and exports', () => {
  const payload = {
    session: { id: 'sess-1', goal: 'Find pricing', persona: null, startedAt: new Date(), endedAt: new Date(), stepCount: 3, status: 'FAILED' },
    scores: { clarityScore: null, onboardingScore: null, iaScore: null, efficiencyScore: null, overallScore: null },
    evidence: { status: 'insufficient' as const, reason: 'the audit ended FAILED before the agent recorded any action' },
    visualCoverage: computeVisualCoverage({ screenshots: 0, analyzed: false, visualFindings: [] }),
    uxFindings: [], cognitiveSignals: [], visualFindings: [], personaProfiles: [],
  };

  it('has no numeric grade and does not claim a smooth flow', () => {
    const exec = ExecutiveSummaryEngine.synthesize(payload as any);
    expect(exec.overallUXGrade).toBe('N/A');
    expect(exec.overallScore).toBeNull();
    expect(exec.evidenceStatus).toBe('insufficient');
    expect(exec.onboardingFrictionLevel).toBe('UNKNOWN');
    expect(exec.synthesizedInsights.join(' ')).toMatch(/Not scored/);
    expect(exec.synthesizedInsights.join(' ')).not.toMatch(/minimal cognitive friction/);
  });

  it('Markdown and PM summary say "not scored", never "null/100"', () => {
    const exec = ExecutiveSummaryEngine.synthesize(payload as any);
    const md = ExportEngine.toMarkdown(payload as any, exec);
    const pm = ExportEngine.toTextSheet(payload as any, exec);
    expect(md).toContain('Not scored: insufficient evidence');
    expect(md).toContain('Insufficient evidence.');
    expect(pm).toContain('NOT SCORED - insufficient evidence (Grade: N/A)');
    expect(md + pm).not.toMatch(/null\/100|undefined\/100/);
  });
});

describe('zero-evidence report: no diagnostic values anywhere in the exports', () => {
  const payload: any = {
    session: { id: 'sess-0', goal: 'Find pricing', persona: null, startedAt: new Date(), endedAt: new Date(), stepCount: 3, status: 'FAILED' },
    scores: { clarityScore: null, onboardingScore: null, iaScore: null, efficiencyScore: null, overallScore: null },
    evidence: { status: 'insufficient', reason: 'no actions' },
    visualCoverage: computeVisualCoverage({ screenshots: 0, analyzed: false, visualFindings: [] }),
    uxFindings: [], cognitiveSignals: [], visualFindings: [],
    personaProfiles: [{ name: 'Beginner User', description: 'd', traits: { guidanceDependency: 'high', patience: 'low', comfortWithIA: 'low' }, behaviorModifiers: { idleHesitationThresholdMs: 1, maxActionCyclesAllowed: 1, excessiveStepsThreshold: 1 } }],
  };
  const exec = ExecutiveSummaryEngine.synthesize(payload);

  it('executive summary: risk levels UNKNOWN, no friction steps', () => {
    expect(exec.discoverabilityRiskLevel).toBe('UNKNOWN');
    expect(exec.onboardingFrictionLevel).toBe('UNKNOWN');
    expect(exec.majorFrictionStepIndices).toEqual([]);
  });

  it('Markdown: findings and persona projections say unavailable, no persona table, no "LOW" risk', () => {
    const md = ExportEngine.toMarkdown(payload, exec);
    expect(md).toContain(`*${NO_EVIDENCE_LABEL} (the audit recorded no agent actions).*`);
    expect(md).toMatch(/Simulated Persona Performance Projections\n\*Unavailable: no evidence\.\*/);
    expect(md).not.toContain('| **Beginner User** |');
    expect(md).not.toMatch(/Discoverability Risk: LOW/);
    expect(md).not.toMatch(/No major behavioral UX issues detected/);
  });

  it('PM summary: spikes unavailable, no "maintain routes" advice', () => {
    const pm = ExportEngine.toTextSheet(payload, exec);
    expect(pm).toContain(`Steps with Spikes: ${NO_EVIDENCE_LABEL}`);
    expect(pm).toContain('Discoverability Risk: UNKNOWN');
    expect(pm).not.toContain('Maintain existing workflow routes');
  });

  it('JSON: explicit availability block so empty arrays are not read as "no issues"', () => {
    const json = JSON.parse(ExportEngine.toDeveloperJson(payload, exec));
    expect(json.availability).toEqual({ behaviouralAnalysis: NO_EVIDENCE_LABEL, cognitiveSignals: NO_EVIDENCE_LABEL, personaProjections: NO_EVIDENCE_LABEL, uxFindings: NO_EVIDENCE_LABEL });
  });

  it('PDF: findings and personas unavailable, no persona table, no positive empty state', () => {
    const html = PDFRenderer.renderHTML(payload, exec);
    expect(html).toContain(`${NO_EVIDENCE_LABEL} (the audit recorded no agent actions).`);
    expect(html).not.toContain('No major behavioral UX issues detected');
    expect(html).not.toContain('<td>Beginner User</td>');
  });

  it('with evidence, the same exports still show real values', () => {
    const ok: any = { ...payload, evidence: { status: 'sufficient' }, scores: { clarityScore: 90, onboardingScore: 90, iaScore: 90, efficiencyScore: 90, overallScore: 90 } };
    const e = ExecutiveSummaryEngine.synthesize(ok);
    expect(JSON.parse(ExportEngine.toDeveloperJson(ok, e)).availability.uxFindings).toBe('available');
    expect(ExportEngine.toMarkdown(ok, e)).toContain('| **Beginner User** |');
  });
});

describe('computeVisualCoverage', () => {
  const vf = (findingType: string, screenshotId: string) => ({ findingType, screenshotId });
  it('full only when vision answered and nothing failed', () => {
    const c = computeVisualCoverage({ screenshots: 3, analyzed: true, visualFindings: [vf('vision_summary', 'a'), vf('weak_cta', 'a')] });
    expect(c).toMatchObject({ status: 'full', complete: true, visionSucceeded: 1, visionUnavailable: 0 });
  });
  it('partial / failed / heuristics_only / not_analyzed are all incomplete', () => {
    expect(computeVisualCoverage({ screenshots: 3, analyzed: true, visualFindings: [vf('vision_summary', 'a'), vf('vision_unavailable', 'b')] }))
      .toMatchObject({ status: 'partial', complete: false });
    expect(computeVisualCoverage({ screenshots: 3, analyzed: true, visualFindings: [vf('vision_unavailable', 'a'), vf('vision_unavailable', 'b')] }))
      .toMatchObject({ status: 'failed', complete: false, visionUnavailable: 2 });
    expect(computeVisualCoverage({ screenshots: 3, analyzed: true, visualFindings: [vf('weak_cta', 'a')] }))
      .toMatchObject({ status: 'heuristics_only', complete: false });
    expect(computeVisualCoverage({ screenshots: 3, analyzed: false, visualFindings: [] }))
      .toMatchObject({ status: 'not_analyzed', complete: false });
  });
});
