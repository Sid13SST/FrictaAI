import { UXFindingData, CognitiveSignalData, UXScore, UXReportPayload, PersonaProfileData } from '../types';

export class ReportCompiler {
  /**
   * Compiles findings and cognitive signals into a final scored payload.
   */
  static compile(
    sessionId: string,
    findings: UXFindingData[],
    cognitiveSignals: CognitiveSignalData[],
    personas: PersonaProfileData[]
  ): UXReportPayload {
    // 1. Calculate Sub-Scores (Clarity, Onboarding, IA, Efficiency)
    let clarityScore = 100;
    let onboardingScore = 100;
    let iaScore = 100;
    let efficiencyScore = 100;

    findings.forEach(f => {
      let penalty = 10;
      if (f.severity === 'MEDIUM') penalty = 20;
      if (f.severity === 'HIGH') penalty = 30;
      if (f.severity === 'CRITICAL') penalty = 40;

      // Clarity is affected by everything
      clarityScore -= penalty * 0.5;

      if (f.findingType === 'ONBOARDING_FRICTION' || f.findingType === 'CTA_AMBIGUITY') {
        onboardingScore -= penalty;
      } else if (f.findingType === 'IA_CONFUSION' || f.findingType === 'NAVIGATION_LOOP') {
        iaScore -= penalty;
      } else if (f.findingType === 'FORM_FRICTION' || f.findingType === 'COMPLEXITY') {
        efficiencyScore -= penalty;
      }
    });

    // Make sure scores fall in bounds [0, 100]
    clarityScore = Math.max(0, Math.min(100, Math.round(clarityScore)));
    onboardingScore = Math.max(0, Math.min(100, Math.round(onboardingScore)));
    iaScore = Math.max(0, Math.min(100, Math.round(iaScore)));
    efficiencyScore = Math.max(0, Math.min(100, Math.round(efficiencyScore)));

    const overallScore = Math.round((clarityScore + onboardingScore + iaScore + efficiencyScore) / 4);

    const scores: UXScore = {
      clarityScore,
      onboardingScore,
      iaScore,
      efficiencyScore,
      overallScore
    };

    return {
      sessionId,
      scores,
      findings,
      cognitiveSignals,
      personaProfiles: personas
    };
  }
}
