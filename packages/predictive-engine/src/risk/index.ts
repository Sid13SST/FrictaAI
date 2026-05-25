import { RiskSignalInput } from '../types';

export class RiskPredictor {
  public static calculate(
    workflowPath: string,
    historyStats: { averageFriction: number; successRate: number },
    elements: Array<{ selector: string; ctaProminence: number; contrastStrength: number; interactionDensity: number }>
  ): RiskSignalInput[] {
    const signals: RiskSignalInput[] = [];

    // 1. Workflow Collapse Risk
    if (historyStats.successRate < 0.8) {
      signals.push({
        stepIndex: 4,
        riskType: 'WORKFLOW_COLLAPSE',
        confidenceScore: 0.82,
        severity: historyStats.successRate < 0.6 ? 'CRITICAL' : 'HIGH',
        targetSelector: 'button[type="submit"]',
        contributingSignals: ['Low historical success rate', 'High latency on confirmation CTA'],
        evidenceNotes: `Predictive models suggest a ${((1 - historyStats.successRate) * 100).toFixed(0)}% chance of workflow collapse at the submission step based on historical drop-offs.`,
        historicalBasis: 'Prior user sessions show repetitive failure clusters around submit button actioning.',
      });
    }

    // 2. Onboarding Failure Risk
    const isCheckout = workflowPath.includes('checkout') || workflowPath.includes('cart');
    if (isCheckout) {
      signals.push({
        stepIndex: 0,
        riskType: 'ONBOARDING_FAILURE',
        confidenceScore: 0.74,
        severity: 'MEDIUM',
        targetSelector: 'input[name="email"]',
        contributingSignals: ['Required validation hurdles', 'High hesitation on signup inputs'],
        evidenceNotes: 'Complexity in initial form inputs is expected to trigger early-stage hesitation loops.',
        historicalBasis: 'Distracted and beginner personas show delayed typing events during email and password configuration.',
      });
    }

    // 3. CTA Weakness Risk
    const weakCTA = elements.find(el => el.ctaProminence < 0.4 && el.contrastStrength < 0.6);
    if (weakCTA) {
      signals.push({
        stepIndex: 2,
        riskType: 'CTA_WEAKNESS',
        confidenceScore: 0.88,
        severity: 'HIGH',
        targetSelector: weakCTA.selector,
        contributingSignals: ['Low visual prominence', 'Low contrast weight'],
        evidenceNotes: `The selector "${weakCTA.selector}" possesses low discoverability coefficients (prominence: ${weakCTA.ctaProminence.toFixed(2)}, contrast: ${weakCTA.contrastStrength.toFixed(2)}).`,
        historicalBasis: 'Visual attention heatmap logs show users repeatedly scan past this option without interacting.',
      });
    } else {
      // Default fallback CTA weakness
      signals.push({
        stepIndex: 2,
        riskType: 'CTA_WEAKNESS',
        confidenceScore: 0.65,
        severity: 'LOW',
        targetSelector: 'a.forgot-password',
        contributingSignals: ['Secondary layout priority'],
        evidenceNotes: 'Secondary links have low prominence ratios.',
        historicalBasis: 'Minimal interactions logged in past session histories.',
      });
    }

    // 4. Navigation Failure Risk
    signals.push({
      stepIndex: 1,
      riskType: 'NAVIGATION_FAILURE',
      confidenceScore: 0.71,
      severity: 'MEDIUM',
      targetSelector: 'div.form-container',
      contributingSignals: ['Visual scanning loop detected', 'Complex choice clusters'],
      evidenceNotes: 'Ambiguous grouping of choices forces multiple visual loops before interaction.',
      historicalBasis: 'Historical paths display horizontal cursor drift over static elements.',
    });

    // 5. Friction Escalation Risk
    if (historyStats.averageFriction > 0.4) {
      signals.push({
        stepIndex: 3,
        riskType: 'FRICTION_ESCALATION',
        confidenceScore: 0.79,
        severity: 'HIGH',
        targetSelector: 'input[name="password"]',
        contributingSignals: ['Progressive load accumulation', 'Retry fatigue on credential validation'],
        evidenceNotes: 'User frustration compounds as multiple verification inputs are presented sequentially.',
        historicalBasis: 'Longitudinal logs show steep drops in confidence on input steps.',
      });
    }

    // 6. Cognitive Overload Risk
    const denseLayout = elements.reduce((sum, el) => sum + el.interactionDensity, 0) / elements.length;
    if (denseLayout > 0.4) {
      signals.push({
        stepIndex: 3,
        riskType: 'COGNITIVE_OVERLOAD',
        confidenceScore: 0.85,
        severity: 'HIGH',
        targetSelector: 'div.sidebar-banner',
        contributingSignals: ['High choice count', 'Visual clutter density'],
        evidenceNotes: `The interface presents a high cognitive load ratio of ${denseLayout.toFixed(2)} due to visual ads and input density.`,
        historicalBasis: 'Cognitive timeline tracks frequent load spike anomalies exceeding 0.7.',
      });
    }

    // 7. Mobile UX Failure Risk
    signals.push({
      stepIndex: 4,
      riskType: 'MOBILE_FAILURE',
      confidenceScore: 0.68,
      severity: 'MEDIUM',
      targetSelector: 'button[type="submit"]',
      contributingSignals: ['Responsive scaling overlap', 'Small tap targets'],
      evidenceNotes: 'Desktop-oriented viewports trigger clipping and wrapping on mobile resolution simulations.',
      historicalBasis: 'Persona trends indicate high abandonment rates for Mobile-First User runs.',
    });

    return signals;
  }
}
