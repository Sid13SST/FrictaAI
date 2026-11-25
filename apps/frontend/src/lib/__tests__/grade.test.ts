import { describe, it, expect } from 'vitest';
import { gradeForScore } from '../grade';

describe('gradeForScore', () => {
  it('uses the backend executive-summary bands', () => {
    expect([95, 90, 89, 80, 79, 70, 69, 60, 59, 0].map(gradeForScore)).toEqual(['A', 'A', 'B', 'B', 'C', 'C', 'D', 'D', 'F', 'F']);
  });
  it('null / undefined = not scored, never a letter', () => {
    expect(gradeForScore(null)).toBe('N/A');
    expect(gradeForScore(undefined)).toBe('N/A');
  });
});
