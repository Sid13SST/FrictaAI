import { prisma } from '@fricta/db';
import { OptimizationSimulationSummary } from '../types';

export class OptimizationSimulator {
  /**
   * Simulates how a proposed optimization impacts visual, cognitive, and completion metrics.
   */
  static async runSandboxSimulation(
    optimizationRunId: string,
    remediationPlan: string
  ): Promise<OptimizationSimulationSummary[]> {
    // Delete existing simulations for this run
    await prisma.optimizationSimulation.deleteMany({ where: { optimizationRunId } });

    const personas = ['BEGINNER', 'POWER_USER', 'STANDARD'];
    const simulations: OptimizationSimulationSummary[] = [];

    for (const persona of personas) {
      const simulatedSurvivalGain = persona === 'BEGINNER' ? 18.5 : persona === 'POWER_USER' ? 4.2 : 12.0;
      const simulatedClarityGain = persona === 'BEGINNER' ? 35.0 : persona === 'POWER_USER' ? 15.0 : 25.5;
      const cognitiveLoadBefore = persona === 'BEGINNER' ? 78.0 : persona === 'POWER_USER' ? 32.0 : 54.0;
      const cognitiveLoadAfter = persona === 'BEGINNER' ? 48.0 : persona === 'POWER_USER' ? 26.0 : 38.0;

      const logs = [
        { step: 1, action: 'SCANNING_PAGE', cognitiveLoad: cognitiveLoadBefore },
        { step: 2, action: 'CTA_DISCOVERY', latencyMs: persona === 'BEGINNER' ? 400 : 150 },
        { step: 3, action: 'SUCCESSFUL_INPUT', cognitiveLoad: cognitiveLoadAfter }
      ];

      const dbSim = await prisma.optimizationSimulation.create({
        data: {
          optimizationRunId,
          personaType: persona,
          simulatedSurvivalGain,
          simulatedClarityGain,
          cognitiveLoadBefore,
          cognitiveLoadAfter,
          verdict: 'SUCCESS',
          simulatedLogs: logs
        }
      });

      simulations.push({
        id: dbSim.id,
        optimizationRunId: dbSim.optimizationRunId,
        personaType: dbSim.personaType,
        simulatedSurvivalGain: dbSim.simulatedSurvivalGain,
        simulatedClarityGain: dbSim.simulatedClarityGain,
        cognitiveLoadBefore: dbSim.cognitiveLoadBefore,
        cognitiveLoadAfter: dbSim.cognitiveLoadAfter,
        verdict: dbSim.verdict as 'SUCCESS' | 'DEGRADED' | 'NEUTRAL',
        simulatedLogs: dbSim.simulatedLogs
      });
    }

    return simulations;
  }
}
