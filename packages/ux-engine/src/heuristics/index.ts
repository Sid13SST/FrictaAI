import { UXSignal, SessionData } from '../types';

export interface HeuristicResult {
  category: 'CTA_DISCOVERABILITY' | 'WORKFLOW_COMPLEXITY' | 'NAVIGATION_CLARITY' | 'FORM_USABILITY' | 'ONBOARDING_FRICTION';
  detected: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'NONE';
  evidence: string[];
}

export function analyzeHeuristics(signals: UXSignal[], session: SessionData): HeuristicResult[] {
  const results: HeuristicResult[] = [];

  // 1. CTA Discoverability
  // Triggered by hesitation before specific actions or excessive scrolling
  const hesitations = signals.filter(s => s.signalType === 'HESITATION');
  const excessiveScrolls = signals.filter(s => s.signalType === 'EXCESSIVE_SCROLL');
  
  if (hesitations.length > 0 || excessiveScrolls.length > 0) {
    const evidence: string[] = [];
    if (hesitations.length > 0) evidence.push(`User hesitated ${hesitations.length} times before interacting.`);
    if (excessiveScrolls.length > 0) evidence.push('User exhibited excessive scrolling, likely searching for a CTA.');
    
    results.push({
      category: 'CTA_DISCOVERABILITY',
      detected: true,
      severity: hesitations.some(h => h.severity === 'HIGH') ? 'HIGH' : 'MEDIUM',
      evidence,
    });
  }

  // 2. Workflow Complexity
  const efficiencySignals = signals.filter(s => s.signalType === 'WORKFLOW_EFFICIENCY');
  if (efficiencySignals.length > 0) {
    results.push({
      category: 'WORKFLOW_COMPLEXITY',
      detected: true,
      severity: efficiencySignals[0].severity,
      evidence: [`Workflow required ${session.actions.length} steps, indicating excessive complexity.`],
    });
  }

  // 3. Navigation Clarity
  const navLoops = signals.filter(s => s.signalType === 'NAVIGATION_LOOP');
  if (navLoops.length > 0) {
    results.push({
      category: 'NAVIGATION_CLARITY',
      detected: true,
      severity: navLoops.some(n => n.severity === 'HIGH') ? 'HIGH' : 'MEDIUM',
      evidence: [`Detected ${navLoops.length} navigation loops. User might be confused about routing.`],
    });
  }

  // 4. Form Usability
  const repeatedActions = signals.filter(s => s.signalType === 'REPEATED_ACTION');
  const formRelatedRepeats = repeatedActions.filter(s => {
    const key = (s.metadata as any)?.key || '';
    return key.toLowerCase().includes('input') || key.toLowerCase().includes('type') || key.toLowerCase().includes('fill');
  });

  if (formRelatedRepeats.length > 0) {
    results.push({
      category: 'FORM_USABILITY',
      detected: true,
      severity: formRelatedRepeats.some(f => f.severity === 'HIGH') ? 'HIGH' : 'MEDIUM',
      evidence: [`Repeated failed interactions on form fields detected.`],
    });
  }

  // 5. Onboarding Friction
  const deadEnds = signals.filter(s => s.signalType === 'DEAD_END');
  if (deadEnds.length > 0) {
    results.push({
      category: 'ONBOARDING_FRICTION',
      detected: true,
      severity: 'HIGH',
      evidence: [`User reached a dead-end with no meaningful progress after several attempts.`],
    });
  }

  return results;
}
