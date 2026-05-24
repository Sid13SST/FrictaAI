import { logger } from '@fricta/shared';

export interface PatternCandidate {
  patternType: string;
  name: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  evidenceSummary: string;
  affectedSessions: string[];
}

export class PatternDetectionEngine {
  /**
   * Scans sessions for recurring friction patterns.
   */
  static detect(sessions: any[]): PatternCandidate[] {
    logger.info({ sessionCount: sessions.length }, 'PatternDetectionEngine starting detection scan');
    const candidates: PatternCandidate[] = [];

    if (sessions.length < 2) {
      return candidates; // Need at least two sessions to detect historical trends
    }

    // 1. Repeated Navigation Confusion
    const navFrictionSessions = sessions.filter(s => 
      s.uxFindings?.some((f: any) => f.findingType === 'NAVIGATION_LOOP' || f.findingType === 'IA_CONFUSION')
    );
    if (navFrictionSessions.length >= 2) {
      candidates.push({
        patternType: 'NAVIGATION_CONFUSION',
        name: 'Repeated Navigation Confusion',
        description: 'Users repeatedly encounter circular navigation loops or layout structural confusion.',
        severity: 'MEDIUM',
        confidence: Math.min(0.95, 0.5 + navFrictionSessions.length * 0.1),
        affectedSessions: navFrictionSessions.map(s => s.id),
        evidenceSummary: `Detected navigation loops or Information Architecture confusion in ${navFrictionSessions.length} out of ${sessions.length} sessions.`
      });
    }

    // 2. Persistent Onboarding Friction
    const onboardingSessions = sessions.filter(s => 
      s.goal?.toLowerCase().includes('onboarding') && 
      (s.uxFindings?.some((f: any) => f.findingType === 'ONBOARDING_FRICTION') || s.status === 'FAILED')
    );
    if (onboardingSessions.length >= 2) {
      candidates.push({
        patternType: 'ONBOARDING_FRICTION',
        name: 'Persistent Onboarding Friction',
        description: 'First-mile onboarding workflows consistently trigger hesitation or fail to complete.',
        severity: 'HIGH',
        confidence: Math.min(0.95, 0.6 + onboardingSessions.length * 0.1),
        affectedSessions: onboardingSessions.map(s => s.id),
        evidenceSummary: `Onboarding workflow failed or registered onboarding friction in ${onboardingSessions.length} sessions.`
      });
    }

    // 3. CTA Discoverability Weakness
    const ctaFrictionSessions = sessions.filter(s => 
      s.uxFindings?.some((f: any) => f.findingType === 'CTA_AMBIGUITY') ||
      s.cognitiveSignals?.some((sig: any) => sig.signalType === 'DISCOVERABILITY_FRICTION' && sig.intensity > 0.65)
    );
    if (ctaFrictionSessions.length >= 2) {
      candidates.push({
        patternType: 'CTA_DISCOVERABILITY',
        name: 'CTA Discoverability Weakness',
        description: 'Core actions and buttons are frequently overlooked, leading to interaction delays.',
        severity: 'MEDIUM',
        confidence: Math.min(0.95, 0.55 + ctaFrictionSessions.length * 0.1),
        affectedSessions: ctaFrictionSessions.map(s => s.id),
        evidenceSummary: `CTA discoverability issues or high discoverability friction detected in ${ctaFrictionSessions.length} sessions.`
      });
    }

    // 4. Form Complexity Patterns
    const formFrictionSessions = sessions.filter(s => 
      s.uxFindings?.some((f: any) => f.findingType === 'FORM_FRICTION')
    );
    if (formFrictionSessions.length >= 2) {
      candidates.push({
        patternType: 'FORM_COMPLEXITY',
        name: 'Form Complexity Friction',
        description: 'High input density and validation gates trigger user hesitation in data entry sheets.',
        severity: 'MEDIUM',
        confidence: Math.min(0.95, 0.5 + formFrictionSessions.length * 0.1),
        affectedSessions: formFrictionSessions.map(s => s.id),
        evidenceSummary: `Input forms registered elevated cognitive friction or errors in ${formFrictionSessions.length} sessions.`
      });
    }

    // 5. Workflow Abandonment Trends
    const failedSessions = sessions.filter(s => s.status === 'FAILED');
    if (failedSessions.length >= 2) {
      candidates.push({
        patternType: 'WORKFLOW_ABANDONMENT',
        name: 'Workflow Abandonment Trends',
        description: 'Usability bottlenecks trigger workflow failures or exits before completion.',
        severity: 'CRITICAL',
        confidence: Math.min(0.98, 0.7 + failedSessions.length * 0.1),
        affectedSessions: failedSessions.map(s => s.id),
        evidenceSummary: `System investigations failed or terminated prematurely in ${failedSessions.length} sessions.`
      });
    }

    // 6. Cognitive Overload Signals
    const overloadSessions = sessions.filter(s => 
      s.cognitiveSignals?.some((sig: any) => sig.signalType === 'COGNITIVE_OVERLOAD' && sig.intensity > 0.75)
    );
    if (overloadSessions.length >= 2) {
      candidates.push({
        patternType: 'COGNITIVE_OVERLOAD',
        name: 'Cognitive Overload Threshold Exceeded',
        description: 'Complex layouts or confusing options trigger severe mental overhead spikes.',
        severity: 'HIGH',
        confidence: Math.min(0.95, 0.5 + overloadSessions.length * 0.1),
        affectedSessions: overloadSessions.map(s => s.id),
        evidenceSummary: `Cognitive overload signals spiked above critical threshold (intensity > 0.75) in ${overloadSessions.length} sessions.`
      });
    }

    return candidates;
  }
}
