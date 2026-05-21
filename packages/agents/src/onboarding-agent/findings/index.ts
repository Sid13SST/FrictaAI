import { StructuredFinding, EmittedSignal } from '../../shared';

export class OnboardingFindings {
  static compile(signals: EmittedSignal[]): StructuredFinding[] {
    const findings: StructuredFinding[] = [];

    const guidance = signals.find(s => s.signalType === 'MISSING_GUIDANCE_SIGNAL');
    const emptyState = signals.find(s => s.signalType === 'EMPTY_STATE_FRICTION');
    const hesitation = signals.find(s => s.signalType === 'ONBOARDING_HESITATION');
    const ambiguity = signals.find(s => s.signalType === 'FIRST_ACTION_AMBIGUITY');

    if (guidance && emptyState) {
      findings.push({
        findingType: 'ONBOARDING_FRICTION',
        severity: 'HIGH',
        title: 'Initial Dashboard Lacks Onboarding Guidance',
        description: 'The initial dashboard state provides insufficient onboarding guidance for first-time users attempting to take their first action.',
        evidence: 'Detected empty state container without tutorial cues or guidance elements.'
      });
    } else if (guidance) {
      findings.push({
        findingType: 'ONBOARDING_FRICTION',
        severity: 'MEDIUM',
        title: 'Missing Guidance Cues',
        description: 'First-time users have no onboarding path indicators or tooltips to guide initial setup.',
        evidence: 'No banner, tooltip, or tutorial elements detected in initial layout regions.'
      });
    }

    if (emptyState && !guidance) {
      findings.push({
        findingType: 'EMPTY_STATE_FRICTION',
        severity: 'MEDIUM',
        title: 'Empty State Friction',
        description: 'The landing workspace shows an empty state without clear, immediate instructions or interactive examples.',
        evidence: `Empty state list identified on page: ${emptyState.metadata.pageUrl}`
      });
    }

    if (hesitation) {
      findings.push({
        findingType: 'ONBOARDING_FRICTION',
        severity: 'MEDIUM',
        title: 'Onboarding Hesitation detected',
        description: 'The user took an excessive amount of time to execute their first action, suggesting initial path confusion.',
        evidence: `Initial action delay was ${hesitation.metadata.firstStepDurationSeconds} seconds.`
      });
    }

    if (ambiguity) {
      findings.push({
        findingType: 'ONBOARDING_FRICTION',
        severity: 'LOW',
        title: 'First-Action Ambiguity',
        description: 'First-time users performed multiple immediate navigations, indicating initial landing route ambiguity.',
        evidence: `Initial action sequence: ${ambiguity.metadata.initialActions.join(' ➔ ')}`
      });
    }

    return findings;
  }
}
export default OnboardingFindings;
