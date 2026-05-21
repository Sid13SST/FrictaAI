export class OnboardingHeuristics {
  static detectEmptyStateFriction(screenshots: any[]): boolean {
    // Check elements for texts suggesting empty states e.g. "no tests found", "empty workspace", "create your first"
    for (const s of screenshots) {
      const layout = s.metadata?.layout;
      if (layout) {
        for (const el of layout.elements || []) {
          const txt = (el.text || '').toLowerCase();
          if (
            txt.includes('no ') || 
            txt.includes('empty') || 
            txt.includes('get started') || 
            txt.includes('first') || 
            txt.includes('create your first')
          ) {
            // Found empty state or welcome helper
            return true;
          }
        }
      }
    }
    return false;
  }

  static detectMissingGuidance(screenshots: any[]): boolean {
    // Look for tooltips, helper text, banner regions, or info badges. If none found, return true.
    let guidanceFound = false;
    for (const s of screenshots) {
      const layout = s.metadata?.layout;
      if (layout) {
        for (const el of layout.elements || []) {
          const role = (el.role || '').toLowerCase();
          const txt = (el.text || '').toLowerCase();
          if (role === 'tooltip' || role === 'banner' || txt.includes('need help') || txt.includes('tutorial') || txt.includes('guide')) {
            guidanceFound = true;
          }
        }
      }
    }
    return !guidanceFound;
  }

  static detectFirstActionHesitation(actions: any[]): number {
    // Check if the delay/duration at the first action (step 0 or 1) is exceptionally high
    if (actions.length === 0) return 0;
    const firstAction = actions[0];
    // If metadata contains timestamp differences
    // We can mock or compute based on time difference between action 0 and action 1
    if (actions.length > 1) {
      const t0 = new Date(actions[0].timestamp).getTime();
      const t1 = new Date(actions[1].timestamp).getTime();
      const diffSec = (t1 - t0) / 1000;
      return diffSec; // returns time spent on first action in seconds
    }
    return 0;
  }
}
