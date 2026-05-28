import { UXFinding, HesitationSignal, FrictionReaction } from '@fricta/db';

export interface HeuristicEvaluation {
  matchFound: boolean;
  score: number; // 0.0 to 1.0
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  mitigation: string;
}

export function evaluateCTAAmbiguity(
  findings: UXFinding[],
  reactions: FrictionReaction[]
): HeuristicEvaluation {
  const ctaFindings = findings.filter(f => f.findingType === 'CTA_AMBIGUITY' || f.findingType === 'DISCOVERABILITY_FRICTION');
  const rageClicks = reactions.filter(r => r.reactionType === 'RAGE_CLICK' || r.reactionType === 'REPEATED_CLICK');

  const count = ctaFindings.length + rageClicks.length;
  if (count === 0) {
    return { matchFound: false, score: 0, severity: 'LOW', description: '', mitigation: '' };
  }

  const score = Math.min(1.0, count * 0.25);
  const severity = score > 0.75 ? 'CRITICAL' : score > 0.5 ? 'HIGH' : score > 0.25 ? 'MEDIUM' : 'LOW';

  return {
    matchFound: true,
    score,
    severity,
    description: `High probability of CTA degradation due to ${ctaFindings.length} discoverability findings and ${rageClicks.length} rage/repeated click reactions.`,
    mitigation: 'Enhance CTA visibility, add visual feedback, and decrease surrounding layout noise.'
  };
}

export function evaluateNavigationBreakdown(
  findings: UXFinding[],
  hesitations: HesitationSignal[]
): HeuristicEvaluation {
  const navLoops = findings.filter(f => f.findingType === 'NAVIGATION_LOOP' || f.findingType === 'IA_CONFUSION');
  const cursorDrifts = hesitations.filter(h => h.signalType === 'CURSOR_DRIFT' || h.signalType === 'HOVER_HESITATION');

  const count = navLoops.length + cursorDrifts.length;
  if (count === 0) {
    return { matchFound: false, score: 0, severity: 'LOW', description: '', mitigation: '' };
  }

  const score = Math.min(1.0, count * 0.2);
  const severity = score > 0.8 ? 'CRITICAL' : score > 0.5 ? 'HIGH' : score > 0.25 ? 'MEDIUM' : 'LOW';

  return {
    matchFound: true,
    score,
    severity,
    description: `Navigation breakdown risk detected. Evidence shows ${navLoops.length} navigation loop findings and ${hesitations.length} hesitation signals.`,
    mitigation: 'Streamline menu architecture, clarify link labels, and reduce interactive hierarchy depth.'
  };
}

export function evaluateOnboardingSurvivability(
  findings: UXFinding[],
  reactions: FrictionReaction[],
  stepCount: number
): HeuristicEvaluation {
  const onboardingFriction = findings.filter(f => f.findingType === 'ONBOARDING_FRICTION' || f.findingType === 'FORM_FRICTION');
  const dropouts = reactions.filter(r => r.reactionType === 'WORKFLOW_ABANDONMENT' || r.reactionType === 'PAGE_LEAVE');

  const score = Math.min(1.0, (onboardingFriction.length * 0.2) + (dropouts.length * 0.3) + (stepCount > 15 ? 0.2 : 0.0));
  if (score === 0) {
    return { matchFound: false, score: 0, severity: 'LOW', description: '', mitigation: '' };
  }

  const severity = score > 0.8 ? 'CRITICAL' : score > 0.5 ? 'HIGH' : score > 0.25 ? 'MEDIUM' : 'LOW';

  return {
    matchFound: true,
    score,
    severity,
    description: `High risk of onboarding funnel collapse. Funnel has ${onboardingFriction.length} friction occurrences and session steps reach ${stepCount}.`,
    mitigation: 'Shorten the onboarding steps, defer profile configuration until after activation, and auto-populate standard inputs.'
  };
}
