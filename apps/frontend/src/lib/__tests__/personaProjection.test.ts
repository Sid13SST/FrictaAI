import { describe, it, expect } from 'vitest';
import { projectPersonaScores, type OfficialScores } from '../personaProjection';

const official: OfficialScores = { clarityScore: 92, onboardingScore: 95, iaScore: 88, efficiencyScore: 100, overallScore: 95 };

describe('projectPersonaScores', () => {
  it('STANDARD is exactly the official audit score (one source of truth)', () => {
    const p = projectPersonaScores(official, [{ severity: 'HIGH', personaType: 'BEGINNER' }], 'STANDARD');
    expect(p).toMatchObject({ overall: 95, clarity: 92, onboarding: 95, ia: 88, efficiency: 100, isOfficial: true, personaPenalty: 0 });
  });

  it('a persona with no findings matches the official score', () => {
    const p = projectPersonaScores(official, [], 'POWER_USER');
    expect(p.overall).toBe(95);
    expect(p.personaPenalty).toBe(0);
    expect(p.isOfficial).toBe(false);
  });

  it('only findings tagged for the persona lower it, and only on its sensitive pillars', () => {
    const findings = [
      { severity: 'HIGH', personaType: 'BEGINNER' },
      { severity: 'MEDIUM', personaType: 'BEGINNER' },
      { severity: 'CRITICAL', personaType: 'POWER_USER' },
    ];
    const p = projectPersonaScores(official, findings, 'BEGINNER');
    expect(p.personaPenalty).toBe(12);
    expect(p.overall).toBe(83);
    expect(p.clarity).toBe(80);
    expect(p.onboarding).toBe(83);
    expect(p.ia).toBe(88); // untouched
    expect(p.efficiency).toBe(100); // untouched
  });

  it('never exceeds the official overall and clamps at 0', () => {
    const many = Array.from({ length: 20 }, () => ({ severity: 'CRITICAL', personaType: 'FIRST_TIME_USER' }));
    const low = { ...official, overallScore: 20, iaScore: 10 };
    const p = projectPersonaScores(low, many, 'FIRST_TIME_USER');
    expect(p.overall).toBe(0);
    expect(p.ia).toBe(0);
    for (const persona of ['BEGINNER', 'POWER_USER', 'FIRST_TIME_USER'] as const) {
      expect(projectPersonaScores(official, many, persona).overall!).toBeLessThanOrEqual(official.overallScore!);
    }
  });

  it('an unscored audit (insufficient evidence) projects to null for every persona', () => {
    const unscored = { clarityScore: null, onboardingScore: null, iaScore: null, efficiencyScore: null, overallScore: null };
    for (const persona of ['STANDARD', 'BEGINNER', 'POWER_USER', 'FIRST_TIME_USER'] as const) {
      const p = projectPersonaScores(unscored, [{ severity: 'HIGH', personaType: persona }], persona);
      expect([p.overall, p.clarity, p.onboarding, p.ia, p.efficiency]).toEqual([null, null, null, null, null]);
    }
  });
});
