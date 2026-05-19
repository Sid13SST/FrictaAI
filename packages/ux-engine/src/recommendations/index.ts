import { UXRecommendation } from '../types';
import { HeuristicResult } from '../heuristics';

export function generateRecommendations(heuristics: HeuristicResult[]): UXRecommendation[] {
  const recommendations: UXRecommendation[] = [];

  for (const h of heuristics) {
    if (h.category === 'CTA_DISCOVERABILITY') {
      recommendations.push({
        title: 'Improve CTA Prominence',
        description: 'Users are struggling to locate key calls-to-action. Consider increasing the visual prominence, size, or contrast of primary buttons.',
        evidence: h.evidence.join(' '),
        severity: h.severity as any,
      });
    }

    if (h.category === 'WORKFLOW_COMPLEXITY') {
      recommendations.push({
        title: 'Simplify Workflow Steps',
        description: 'The workflow requires an excessive number of actions. Look for opportunities to combine steps, remove redundant fields, or provide better default values.',
        evidence: h.evidence.join(' '),
        severity: h.severity as any,
      });
    }

    if (h.category === 'NAVIGATION_CLARITY') {
      recommendations.push({
        title: 'Clarify Navigation Routing',
        description: 'Users are bouncing between pages. Ensure navigation labels are clear, and provide stronger contextual cues about where the user is within the app.',
        evidence: h.evidence.join(' '),
        severity: h.severity as any,
      });
    }

    if (h.category === 'FORM_USABILITY') {
      recommendations.push({
        title: 'Enhance Form Validation & Clarity',
        description: 'Repeated interactions on form fields suggest users are facing validation errors or confusion about expected input formats. Add inline validation and clear placeholder examples.',
        evidence: h.evidence.join(' '),
        severity: h.severity as any,
      });
    }

    if (h.category === 'ONBOARDING_FRICTION') {
      recommendations.push({
        title: 'Provide Clearer Next Actions',
        description: 'Users are reaching dead-ends. Ensure that every page has a clear "happy path" action and provide contextual help or tooltips for complex tasks.',
        evidence: h.evidence.join(' '),
        severity: h.severity as any,
      });
    }
  }

  return recommendations;
}
