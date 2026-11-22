import { describe, it, expect } from 'vitest';
import { scoreAudit, calculateScores, GOAL_NOT_REACHED_CAP } from '@fricta/ux-engine';
import { ExecutiveSummaryEngine } from '@fricta/report-engine';

const perfect = { clarityScore: 100, efficiencyScore: 100, smoothnessScore: 100 };

function gradeFor(overallScore: number) {
  // Same grade bands the report page, exports and PDF use.
  return ExecutiveSummaryEngine.synthesize({
    session: { id: 's', goal: null, persona: null, startedAt: new Date(), endedAt: null, stepCount: 1 },
    scores: { clarityScore: 0, onboardingScore: 0, iaScore: 0, efficiencyScore: 0, overallScore },
    uxFindings: [], cognitiveSignals: [], visualFindings: [], personaProfiles: [],
  }).overallUXGrade;
}

describe('scoreAudit (single source of truth for the report grade)', () => {
  it('a clean, completed run keeps its behavioural score', () => {
    const s = scoreAudit({ behavioural: perfect, outcome: 'COMPLETED', uxFindings: [], visualFindings: [] });
    expect(s.overallScore).toBe(100);
    expect(s.goalReached).toBe(true);
    expect(gradeFor(s.overallScore)).toBe('A');
  });

  it('is not 100 when findings exist', () => {
    const s = scoreAudit({
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
      const s = scoreAudit({ behavioural: perfect, outcome, uxFindings: [], visualFindings: [] });
      expect(s.overallScore).toBe(GOAL_NOT_REACHED_CAP);
      expect(s.goalReached).toBe(false);
      expect(gradeFor(s.overallScore)).toBe('F');
    }
  });

  it('does not cap a run that is still in progress', () => {
    const s = scoreAudit({ behavioural: perfect, outcome: 'RUNNING', uxFindings: [], visualFindings: [] });
    expect(s.overallScore).toBe(100);
    expect(s.breakdown.outcomeCap).toBeNull();
  });

  it('ignores vision_summary commentary but counts vision/heuristic defects', () => {
    const s = scoreAudit({
      behavioural: perfect, outcome: 'COMPLETED', uxFindings: [],
      visualFindings: [{ severity: 'low', findingType: 'vision_summary' }, { severity: 'medium', findingType: 'vision_finding' }],
    });
    expect(s.breakdown.visualFindingsPenalty).toBe(3);
  });

  it('caps finding penalties so one noisy analysis cannot zero the score', () => {
    const many = Array.from({ length: 50 }, () => ({ severity: 'CRITICAL' }));
    const vis = Array.from({ length: 50 }, () => ({ severity: 'high', findingType: 'weak_cta' }));
    const s = scoreAudit({ behavioural: perfect, outcome: 'COMPLETED', uxFindings: many, visualFindings: vis });
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
    const s = scoreAudit({ behavioural, outcome: 'COMPLETED', uxFindings: [], visualFindings: [] });
    expect(s.overallScore).toBe(behavioural.overallScore);
  });
});
