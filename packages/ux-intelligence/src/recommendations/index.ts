import { UXFindingData, SignalSeverity } from '../types';
import { UXPatternEngine } from '../patterns';

export interface UXRecommendationDetails {
  title: string;
  description: string;
  evidence: string;
  severity: SignalSeverity;
  whyItMatters: string;
  remedySteps: string[];
}

export class RecommendationEngine {
  /**
   * Refines raw findings, injecting explanatory text and design guidelines from the pattern library.
   */
  static generate(findings: UXFindingData[]): UXRecommendationDetails[] {
    return findings.map(finding => {
      let whyItMatters = '';
      let remedySteps: string[] = [];

      // Link findings to patterns
      switch (finding.findingType) {
        case 'ONBOARDING_FRICTION':
          const onboardingPattern = UXPatternEngine.getPattern('guided-onboarding-tips');
          whyItMatters = 'First-time users will abandon the product if they cannot complete their initial task quickly due to cognitive friction and missing help markers.';
          remedySteps = onboardingPattern?.guidelines || [];
          break;

        case 'FORM_FRICTION':
          const disclosurePattern = UXPatternEngine.getPattern('progressive-disclosure-wizard');
          whyItMatters = 'Intimidating, long form layouts increase submission errors, form abandonment rates, and input delays.';
          remedySteps = disclosurePattern?.guidelines || [];
          break;

        case 'CTA_AMBIGUITY':
          const ctaPattern = UXPatternEngine.getPattern('cta-hierarchy-rule');
          whyItMatters = 'When a user is presented with multiple primary colored choices, they suffer from choice paralysis, delaying the workflow.';
          remedySteps = ctaPattern?.guidelines || [];
          break;

        case 'IA_CONFUSION':
          const navPattern = UXPatternEngine.getPattern('navigation-clarity-links');
          whyItMatters = 'Back-and-forth cycling indicates user models are misaligned with routing hierarchy, causing massive frustration.';
          remedySteps = navPattern?.guidelines || [];
          break;

        case 'COMPLEXITY':
          const densityPattern = UXPatternEngine.getPattern('cognitive-load-reduction');
          whyItMatters = 'Unnecessary step counts and navigation clutter lead to decision fatigue, slow task completions, and poor UX scores.';
          remedySteps = densityPattern?.guidelines || [];
          break;

        default:
          whyItMatters = 'Usability friction directly harms customer conversion and increases support request volumes.';
          remedySteps = [
            'Simplify user interaction requirements.',
            'Remove unnecessary navigational steps.',
            'Maintain a clear visual layout hierarchy.'
          ];
      }

      return {
        title: finding.title,
        description: finding.description,
        evidence: finding.evidence,
        severity: finding.severity,
        whyItMatters,
        remedySteps
      };
    });
  }
}
