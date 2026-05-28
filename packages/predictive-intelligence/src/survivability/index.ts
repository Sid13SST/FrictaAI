import { WorkflowSession, UXFinding } from '@fricta/db';

export interface PersonaSurvivalRate {
  personaType: string;
  survivalProbability: number; // 0.0 to 1.0
  expectedDropStep: number;
  retentionRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  survivalCurve: { step: number; probability: number }[];
}

export function computePersonaSurvival(
  sessions: (WorkflowSession & { uxFindings: UXFinding[] })[]
): PersonaSurvivalRate[] {
  const personas = ['BEGINNER', 'POWER_USER', 'FIRST_TIME_USER', 'DISTRACTED_USER', 'STANDARD'];
  const results: PersonaSurvivalRate[] = [];

  for (const persona of personas) {
    const personaSessions = sessions.filter(s => s.persona?.toUpperCase() === persona);
    
    let baseProb = 1.0;
    let expectedDropStep = 10;
    
    if (personaSessions.length > 0) {
      const avgStepCount = personaSessions.reduce((acc, s) => acc + s.stepCount, 0) / personaSessions.length;
      const findingsCount = personaSessions.reduce((acc, s) => acc + s.uxFindings.length, 0);
      
      const frictionPenalty = Math.min(0.7, (findingsCount / personaSessions.length) * 0.15);
      baseProb = Math.max(0.1, 1.0 - frictionPenalty);
      
      // Calculate expected drop step based on persona characteristics
      const patienceFactor = persona === 'POWER_USER' ? 20 : persona === 'BEGINNER' ? 8 : 12;
      expectedDropStep = Math.max(3, Math.round(patienceFactor * baseProb));
    } else {
      // Default fallback
      const defaultPatience = persona === 'POWER_USER' ? 18 : persona === 'BEGINNER' ? 6 : 10;
      baseProb = persona === 'POWER_USER' ? 0.9 : persona === 'BEGINNER' ? 0.55 : 0.75;
      expectedDropStep = defaultPatience;
    }

    const retentionRiskLevel = baseProb > 0.8 ? 'LOW' : baseProb > 0.5 ? 'MEDIUM' : 'HIGH';

    // Generate step-by-step decay curve
    const survivalCurve: { step: number; probability: number }[] = [];
    let currentProb = 1.0;
    for (let step = 1; step <= 20; step++) {
      const decay = step <= expectedDropStep 
        ? 0.02 * (persona === 'BEGINNER' ? 1.5 : 1) 
        : 0.15 * (persona === 'POWER_USER' ? 0.7 : 1.2);
      
      currentProb = Math.max(0.02, currentProb - decay * (1.1 - baseProb));
      survivalCurve.push({ step, probability: Math.round(currentProb * 100) / 100 });
    }

    results.push({
      personaType: persona,
      survivalProbability: Math.round(baseProb * 100) / 100,
      expectedDropStep,
      retentionRiskLevel,
      survivalCurve
    });
  }

  return results;
}
