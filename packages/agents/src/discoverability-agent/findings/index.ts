import { StructuredFinding, EmittedSignal } from '../../shared';

export class DiscoverabilityFindings {
  static compile(signals: EmittedSignal[]): StructuredFinding[] {
    const findings: StructuredFinding[] = [];

    const competing = signals.find(s => s.signalType === 'COMPETING_ACTION_HIERARCHY');
    const weakCta = signals.find(s => s.signalType === 'WEAK_CTA_SIGNAL');
    const affordance = signals.find(s => s.signalType === 'AFFORDANCE_AMBIGUITY');
    const hiddenFeature = signals.find(s => s.signalType === 'HIDDEN_FEATURE_SIGNAL');

    if (competing) {
      findings.push({
        findingType: 'CTA_AMBIGUITY',
        severity: 'MEDIUM',
        title: 'Competing Action Hierarchy',
        description: 'The primary Create action visually competes with secondary navigation elements or adjacent buttons, reducing discoverability.',
        evidence: `Identified ${competing.metadata.primaryButtonsCount} competing button elements in layout viewport.`
      });
    }

    if (weakCta) {
      findings.push({
        findingType: 'CTA_AMBIGUITY',
        severity: 'HIGH',
        title: 'Weak CTA Visual Prominence',
        description: 'Primary call-to-actions are too small or lack sufficient visual contrast, making them hard to discover.',
        evidence: weakCta.metadata.details
      });
    }

    if (affordance) {
      findings.push({
        findingType: 'FORM_FRICTION',
        severity: 'LOW',
        title: 'Affordance Ambiguity detected',
        description: 'Users repeatedly clicked on non-interactive text elements, indicating styling confusion.',
        evidence: 'Clicks recorded on static container elements or headers in interactions telemetry.'
      });
    }

    if (hiddenFeature) {
      findings.push({
        findingType: 'CTA_AMBIGUITY',
        severity: 'MEDIUM',
        title: 'Primary Task Driver Hidden',
        description: 'The user had to toggle menus or search fields repeatedly to find the core feature trigger.',
        evidence: `User clicked layout menus/search ${hiddenFeature.metadata.menuToggles} times before initiating setup.`
      });
    }

    return findings;
  }
}
export default DiscoverabilityFindings;
