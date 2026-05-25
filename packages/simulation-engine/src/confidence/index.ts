import { PersonaTraits } from '../types';

export class ConfidenceTracker {
  private currentConfidence: number;

  constructor(traits: PersonaTraits) {
    this.currentConfidence = traits.navigationConfidence;
  }

  public getConfidence(): number {
    return this.currentConfidence;
  }

  public adjustAfterSuccess(): void {
    // Navigating successfully boosts confidence
    this.currentConfidence = Math.min(1.0, this.currentConfidence + 0.15);
  }

  public adjustAfterFailure(severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): void {
    const deduction = severity === 'CRITICAL' ? 0.3 : severity === 'HIGH' ? 0.2 : severity === 'MEDIUM' ? 0.1 : 0.05;
    this.currentConfidence = Math.max(0.0, this.currentConfidence - deduction);
  }

  public adjustForClutter(clutter: number): void {
    if (clutter > 0.6) {
      this.currentConfidence = Math.max(0.0, this.currentConfidence - (clutter - 0.5) * 0.25);
    }
  }

  public needsBacktrack(traits: PersonaTraits): boolean {
    // If confidence drops below patience threshold, user will choose to backtrack
    const limit = 0.35 - traits.explorationPatience * 0.2; // Power users backtrack later
    return this.currentConfidence < limit;
  }
}
