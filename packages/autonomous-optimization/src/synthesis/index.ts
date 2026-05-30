import { prisma } from '@fricta/db';
import type { SynthesisResult, OpportunityCandidate, InitiativeCandidate, ForecastDefinition } from '../types';
import { OpportunityDetector } from '../opportunities';
import { Prioritizer } from '../prioritization';
import { Forecaster } from '../forecasting';

export class SynthesisEngine {
  static async synthesize(projectId: string): Promise<SynthesisResult> {
    // 1. Gather all required intelligence layers
    const [
      anomalies,
      predictions,
      redesigns,
      outcomes,
      metrics,
      memories,
      sessions
    ] = await Promise.all([
      prisma.uXAnomaly.findMany({ where: { projectId, isResolved: false } }),
      prisma.uXFailurePrediction.findMany({ where: { projectId }, take: 10 }),
      prisma.redesignRecommendation.findMany({ where: { projectId }, take: 10 }),
      prisma.experimentOutcome.findMany({ where: { projectId }, take: 10 }),
      prisma.survivabilityMetric.findMany({ where: { projectId }, orderBy: { timestamp: 'desc' }, take: 20 }),
      prisma.optimizationMemory.findMany({ where: { projectId }, take: 10 }),
      prisma.liveSession.findMany({ where: { projectId }, take: 10 }),
    ]);

    // 2. Feed intelligence into the Opportunity Detector
    const opportunities = await OpportunityDetector.detect(projectId, {
      anomalies,
      predictions,
      redesigns,
      outcomes,
      metrics,
      memories,
      sessions
    });

    // 3. Prioritize opportunities using the Prioritization Engine
    const prioritizedOps = opportunities.map(op => {
      const score = Prioritizer.calculate(op, memories);
      return { ...op, score };
    }).sort((a, b) => b.score - a.score);

    // 4. Generate forecasts for prioritized opportunities
    const forecasts: ForecastDefinition[] = prioritizedOps.map(op => {
      return Forecaster.generateForecast(op, metrics);
    });

    // 5. Generate initiatives corresponding to opportunities
    const initiatives: InitiativeCandidate[] = prioritizedOps.map(op => {
      return {
        projectId,
        title: `Optimize ${op.title}`,
        description: `Initiative targeting detected ${op.opportunityType.toLowerCase()} opportunity: ${op.description}`,
        impactArea: op.opportunityType,
        score: op.score,
        complexity: op.implementationComplexity,
      };
    });

    return {
      opportunities: prioritizedOps,
      initiatives,
      forecasts
    };
  }
}
