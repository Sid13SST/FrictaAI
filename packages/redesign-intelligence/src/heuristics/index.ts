import { UXFinding, FrictionReaction, HesitationSignal } from '@fricta/db';

export interface RedesignRuleResult {
  shouldPropose: boolean;
  confidence: number;
  impactScore: number;
  reason: string;
  proposedChange: string;
}

export function evaluateCTARules(
  findings: UXFinding[],
  reactions: FrictionReaction[]
): RedesignRuleResult {
  const ctaBarriers = findings.filter(f => f.findingType === 'CTA_AMBIGUITY' || f.findingType === 'DISCOVERABILITY_FRICTION');
  const retries = reactions.filter(r => r.reactionType === 'RETRY_HESITATION');

  const count = ctaBarriers.length + retries.length;
  if (count === 0) {
    return { shouldPropose: false, confidence: 0, impactScore: 0, reason: '', proposedChange: '' };
  }

  const confidence = Math.min(0.98, 0.4 + count * 0.15);
  const impactScore = Math.min(95, 20 + count * 12.5);

  return {
    shouldPropose: true,
    confidence,
    impactScore,
    reason: `Primary visual action on dashboard causes discoverability delays due to ${ctaBarriers.length} active CTA barrier alerts.`,
    proposedChange: 'Contrast primary action color using HSL slate-mint palettes, increase typography weight, and clear at least 20px of margins surrounding the button.'
  };
}

export function evaluateOnboardingRules(
  findings: UXFinding[],
  reactions: FrictionReaction[]
): RedesignRuleResult {
  const onboardingFriction = findings.filter(f => f.findingType === 'ONBOARDING_FRICTION' || f.findingType === 'FORM_FRICTION');
  const abandonments = reactions.filter(r => r.reactionType === 'ABANDONMENT_RISK');

  const count = onboardingFriction.length + abandonments.length;
  if (count === 0) {
    return { shouldPropose: false, confidence: 0, impactScore: 0, reason: '', proposedChange: '' };
  }

  const confidence = Math.min(0.95, 0.5 + count * 0.1);
  const impactScore = Math.min(98, 30 + count * 15);

  return {
    shouldPropose: true,
    confidence,
    impactScore,
    reason: `Onboarding path has high abandonment risk driven by ${onboardingFriction.length} form input bottlenecks and step-by-step fatigue.`,
    proposedChange: 'Consolidate the onboarding flow into a three-step accordion configuration, defer non-essential profile questions, and enable progressive disclosure for inputs.'
  };
}
