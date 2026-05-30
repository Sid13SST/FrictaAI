import type { OpportunityCandidate } from '../types';

export class OpportunityDetector {
  static async detect(projectId: string, layers: {
    anomalies: any[];
    predictions: any[];
    redesigns: any[];
    outcomes: any[];
    metrics: any[];
    memories: any[];
    sessions: any[];
  }): Promise<OpportunityCandidate[]> {
    const candidates: OpportunityCandidate[] = [];
    const { anomalies, predictions, redesigns, outcomes, metrics, memories, sessions } = layers;

    // Detect Onboarding Opportunity
    const onboardingSurv = metrics.find(m => m.metricType === 'ONBOARDING_SURVIVABILITY')?.value ?? 0.85;
    if (onboardingSurv < 0.80) {
      candidates.push({
        projectId,
        opportunityType: 'ONBOARDING',
        title: 'Optimize Onboarding Completion Rate',
        description: `Onboarding survivability is currently degraded at ${(onboardingSurv * 100).toFixed(0)}%, which is below the target threshold of 80%.`,
        evidence: [
          `Metric ONBOARDING_SURVIVABILITY at ${onboardingSurv.toFixed(2)}`,
          ...anomalies.filter(a => a.description.toLowerCase().includes('onboarding')).map(a => `Anomaly: ${a.description}`)
        ],
        score: 0, // calculated by prioritizer
        impactPotential: 0.15,
        userReach: 0.45,
        severity: 'HIGH',
        confidence: 0.75,
        survivabilityGain: 0.12,
        implementationComplexity: 'MEDIUM'
      });
    }

    // Detect High Friction Opportunity (rage clicks, dead clicks)
    const rageClickAnomalies = anomalies.filter(a => a.anomalyType === 'RAGE_CLICK_SPIKE');
    if (rageClickAnomalies.length > 0) {
      candidates.push({
        projectId,
        opportunityType: 'HIGH_FRICTION',
        title: 'Mitigate Checkout CTA Rage Clicks',
        description: `Detected ${rageClickAnomalies.length} active rage click spikes pointing to element interaction blockages in user flows.`,
        evidence: rageClickAnomalies.map(a => `Anomaly: ${a.description} (${a.severity})`),
        score: 0,
        impactPotential: 0.20,
        userReach: 0.35,
        severity: 'CRITICAL',
        confidence: 0.85,
        survivabilityGain: 0.18,
        implementationComplexity: 'LOW'
      });
    }

    // Detect CTA Opportunities
    const ctaSurv = metrics.find(m => m.metricType === 'CTA_SURVIVABILITY')?.value ?? 0.95;
    if (ctaSurv < 0.90) {
      candidates.push({
        projectId,
        opportunityType: 'CTA',
        title: 'Enhance Call-to-Action Visibility',
        description: `CTA survivability metric is at ${(ctaSurv * 100).toFixed(0)}%, indicating key action buttons fail to drive required conversions.`,
        evidence: [`CTA_SURVIVABILITY at ${ctaSurv.toFixed(2)}`],
        score: 0,
        impactPotential: 0.12,
        userReach: 0.60,
        severity: 'MEDIUM',
        confidence: 0.70,
        survivabilityGain: 0.08,
        implementationComplexity: 'LOW'
      });
    }

    // Detect Navigation Opportunities
    const navLoopAnomalies = anomalies.filter(a => a.anomalyType === 'NAV_LOOP_ESCALATION');
    if (navLoopAnomalies.length > 0) {
      candidates.push({
        projectId,
        opportunityType: 'NAVIGATION',
        title: 'Resolve Page Navigation Circular Loops',
        description: 'Users are getting trapped in repetitive circular page transitions, indicating misleading navigation hierarchies.',
        evidence: navLoopAnomalies.map(a => `Anomaly: ${a.description}`),
        score: 0,
        impactPotential: 0.18,
        userReach: 0.20,
        severity: 'HIGH',
        confidence: 0.80,
        survivabilityGain: 0.15,
        implementationComplexity: 'HIGH'
      });
    }

    // Detect Cognitive Opportunities
    const cognitiveRisk = predictions.filter(p => p.predictionType === 'COGNITIVE_OVERLOAD_RISK');
    if (cognitiveRisk.length > 0) {
      candidates.push({
        projectId,
        opportunityType: 'COGNITIVE',
        title: 'Simplify Checkout Form Layout',
        description: 'Predictive cognitive burden models flag complex text field clusters and dense checkout components as high friction.',
        evidence: cognitiveRisk.map(p => `Predictive: ${p.description} (Risk score: ${p.confidence.toFixed(2)})`),
        score: 0,
        impactPotential: 0.10,
        userReach: 0.80,
        severity: 'MEDIUM',
        confidence: 0.65,
        survivabilityGain: 0.06,
        implementationComplexity: 'MEDIUM'
      });
    }

    // Default Fallback Opportunity if none detected
    if (candidates.length === 0) {
      candidates.push({
        projectId,
        opportunityType: 'SURVIVABILITY',
        title: 'Optimize Core User Survivability',
        description: 'General baseline improvement initiatives targeting overall layout stability and telemetry health patterns.',
        evidence: ['Baseline survivability consolidation check'],
        score: 0,
        impactPotential: 0.05,
        userReach: 1.0,
        severity: 'LOW',
        confidence: 0.50,
        survivabilityGain: 0.03,
        implementationComplexity: 'LOW'
      });
    }

    return candidates;
  }
}
