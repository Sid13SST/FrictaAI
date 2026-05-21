import { UnifiedUXReportPayload, ExecutiveSummaryPayload } from './types';

export class ExecutiveSummaryEngine {
  /**
   * Synthesizes a premium, PM-ready executive summary from unified UX findings and cognitive signals.
   */
  static synthesize(report: UnifiedUXReportPayload): ExecutiveSummaryPayload {
    const score = report.scores.overallScore;
    
    // 1. Calculate Overall UX Grade
    let overallUXGrade: 'A' | 'B' | 'C' | 'D' | 'F' = 'C';
    if (score >= 90) overallUXGrade = 'A';
    else if (score >= 80) overallUXGrade = 'B';
    else if (score >= 70) overallUXGrade = 'C';
    else if (score >= 60) overallUXGrade = 'D';
    else overallUXGrade = 'F';

    // 2. Compute Onboarding Friction and Discoverability Risks
    const onboardingScore = report.scores.onboardingScore;
    let onboardingFrictionLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (onboardingScore < 50) onboardingFrictionLevel = 'CRITICAL';
    else if (onboardingScore < 70) onboardingFrictionLevel = 'HIGH';
    else if (onboardingScore < 85) onboardingFrictionLevel = 'MEDIUM';

    const hasWeakCTA = report.visualFindings.some(f => f.findingType === 'weak_cta') || 
                       report.uxFindings.some(f => f.findingType === 'CTA_AMBIGUITY');
    const discoverabilityIntensity = report.cognitiveSignals.find(s => s.signalType === 'DISCOVERABILITY_FRICTION')?.intensity || 0;
    
    let discoverabilityRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (discoverabilityIntensity > 0.7 || (hasWeakCTA && discoverabilityIntensity > 0.5)) {
      discoverabilityRiskLevel = 'CRITICAL';
    } else if (discoverabilityIntensity > 0.4 || hasWeakCTA) {
      discoverabilityRiskLevel = 'HIGH';
    } else if (discoverabilityIntensity > 0.2) {
      discoverabilityRiskLevel = 'MEDIUM';
    }

    // 3. Identify Step indices where friction accumulates
    const majorFrictionStepIndices: number[] = [];
    
    // Look at critical/high findings
    report.uxFindings.forEach(f => {
      if (f.severity === 'HIGH' || f.severity === 'CRITICAL') {
        const stepMatch = f.evidence.match(/step (\d+)/i);
        if (stepMatch) {
          const sIdx = parseInt(stepMatch[1], 10);
          if (!majorFrictionStepIndices.includes(sIdx)) {
            majorFrictionStepIndices.push(sIdx);
          }
        }
      }
    });

    report.visualFindings.forEach(f => {
      if (f.severity === 'HIGH' || f.severity === 'CRITICAL') {
        const stepMatch = f.description.match(/step (\d+)/i);
        const sIdx = stepMatch ? parseInt(stepMatch[1], 10) : (f.metadata as any)?.stepIndex;
        if (sIdx !== undefined && !majorFrictionStepIndices.includes(sIdx)) {
          majorFrictionStepIndices.push(sIdx);
        }
      }
    });

    // Sort step indices chronologically
    majorFrictionStepIndices.sort((a, b) => a - b);

    // 4. Synthesize Cross-Analysis Global Insights
    const synthesizedInsights: string[] = [];

    // Hesitation / Onboarding insight
    const onboardingHesitations = report.uxFindings.filter(f => f.findingType === 'ONBOARDING_FRICTION');
    if (onboardingHesitations.length > 0) {
      const evidenceSteps = onboardingHesitations.map(f => {
        const m = f.evidence.match(/step (\d+)/i);
        return m ? `Step ${m[1]}` : '';
      }).filter(Boolean);
      
      const stepStr = evidenceSteps.length > 0 ? ` during ${evidenceSteps.join(', ')}` : '';
      synthesizedInsights.push(
        `First-time users experience significant onboarding hesitation due to unclear CTA hierarchy or lack of helper prompts${stepStr}.`
      );
    }

    // Navigation loops insight
    const navLoops = report.uxFindings.filter(f => f.findingType === 'IA_CONFUSION' || f.findingType === 'NAVIGATION_LOOP');
    if (navLoops.length > 0) {
      synthesizedInsights.push(
        `Navigation complexity increases sharply, correlating with repeated route-switching loop behaviors that misalign with user mental models.`
      );
    }

    // Cognitive density/clutter insight
    const densitySpikes = report.cognitiveSignals.filter(s => s.signalType === 'COGNITIVE_OVERLOAD' && s.intensity > 0.6);
    if (densitySpikes.length > 0 || report.visualFindings.some(f => f.findingType === 'clutter')) {
      synthesizedInsights.push(
        `High element density and overlapping layouts create discoverability risks, elevating decision fatigue for standard and beginner personas alike.`
      );
    }

    // Step count deviation insight
    const complexitySpikes = report.uxFindings.filter(f => f.findingType === 'COMPLEXITY' && f.severity === 'HIGH');
    if (complexitySpikes.length > 0) {
      synthesizedInsights.push(
        `Workflow branching complexity exceeds standard thresholds, introducing interaction fatigue and sub-optimal task completion times.`
      );
    }

    // Add fallback if empty
    if (synthesizedInsights.length === 0) {
      synthesizedInsights.push(
        `The workflow progresses linearly with minimal cognitive friction. Maintain the current layout and primary progression paths.`
      );
    }

    return {
      overallUXGrade,
      overallScore: score,
      onboardingFrictionLevel,
      discoverabilityRiskLevel,
      majorFrictionStepIndices,
      synthesizedInsights
    };
  }
}
