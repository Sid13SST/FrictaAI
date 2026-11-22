/**
 * Letter grade for an audit score. Same bands as the backend's executive
 * summary (A ≥ 90, B ≥ 80, C ≥ 70, D ≥ 60, else F), so the reports list and
 * the report page never disagree. null = not scored (insufficient evidence).
 */
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F' | 'N/A';

export function gradeForScore(score: number | null | undefined): Grade {
  if (score === null || score === undefined || Number.isNaN(score)) return 'N/A';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export const NOT_SCORED_LABEL = 'Not scored: insufficient evidence';
