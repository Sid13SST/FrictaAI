/**
 * Persona projection for the report's UX Findings tab.
 *
 * The audit has ONE overall score: the backend's `scores.overallScore`
 * (scoreAudit in @fricta/ux-engine), which also drives the letter grade and
 * the exports. This module does not invent a second score. It projects that
 * official score onto a persona:
 *   - STANDARD returns the official pillars and overall unchanged.
 *   - Other personas start from the official pillars and subtract only the
 *     findings tagged for that persona, on the pillars that persona is
 *     sensitive to. The projected overall can never exceed the official one.
 *
 * (It replaces hard-coded per-persona constants that ignored the audit and
 * produced, e.g., "Overall Score 89" beside an "A 100/100" grade.)
 */
export type PersonaKey = 'STANDARD' | 'BEGINNER' | 'POWER_USER' | 'FIRST_TIME_USER';

export interface OfficialScores {
  clarityScore: number;
  onboardingScore: number;
  iaScore: number;
  efficiencyScore: number;
  overallScore: number;
}

export interface PersonaFinding {
  severity: string;
  personaType?: string | null;
}

export interface PersonaProjection {
  clarity: number;
  onboarding: number;
  ia: number;
  efficiency: number;
  overall: number;
  /** Points removed from the official overall for this persona (0 for STANDARD). */
  personaPenalty: number;
  isOfficial: boolean;
}

type Pillar = 'clarity' | 'onboarding' | 'ia' | 'efficiency';

/** Which pillars each persona is sensitive to (matches the persona cards' descriptions). */
export const PERSONA_SENSITIVITY: Record<Exclude<PersonaKey, 'STANDARD'>, Pillar[]> = {
  BEGINNER: ['clarity', 'onboarding'],
  POWER_USER: ['efficiency'],
  FIRST_TIME_USER: ['ia', 'onboarding'],
};

const SEVERITY_POINTS: Record<string, number> = { CRITICAL: 12, HIGH: 8, MEDIUM: 4, LOW: 2 };
const MAX_PERSONA_PENALTY = 40;

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function projectPersonaScores(
  official: OfficialScores,
  findings: PersonaFinding[],
  persona: PersonaKey,
): PersonaProjection {
  const base = {
    clarity: clamp(official.clarityScore),
    onboarding: clamp(official.onboardingScore),
    ia: clamp(official.iaScore),
    efficiency: clamp(official.efficiencyScore),
  };

  if (persona === 'STANDARD') {
    return { ...base, overall: clamp(official.overallScore), personaPenalty: 0, isOfficial: true };
  }

  const personaPenalty = Math.min(
    MAX_PERSONA_PENALTY,
    findings
      .filter((f) => f.personaType === persona)
      .reduce((sum, f) => sum + (SEVERITY_POINTS[String(f.severity).toUpperCase()] ?? 0), 0),
  );

  const projected = { ...base };
  for (const pillar of PERSONA_SENSITIVITY[persona]) {
    projected[pillar] = clamp(projected[pillar] - personaPenalty);
  }

  return {
    ...projected,
    overall: clamp(official.overallScore - personaPenalty),
    personaPenalty,
    isOfficial: false,
  };
}
