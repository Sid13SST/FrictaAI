import { LongitudinalTrendAnalyzer } from '../trends';
import { PersistentPatternDetector } from '../patterns';
import { UsabilityRegressionAnalyzer } from '../regressions';
import { PersonaEvolutionTracker } from '../personas';
import { LongtermBehaviorAnalyzer } from '../behavior';
import { WorkflowSurvivabilityTracker } from '../survivability';
import { LongitudinalSignalAnalyzer } from '../signals';
import { WorkspacePortfolioManager } from '../organizations';
import { prisma } from '@fricta/db';

export class CrossSessionSynthesizer {
  /**
   * Main synthesis pipeline runner. Performs longitudinal analysis across the workspace/project scope.
   */
  static async runSynthesisPipeline(projectId: string, workspaceId: string | null) {
    console.log(`Starting longitudinal UX synthesis for project: ${projectId} (Workspace: ${workspaceId})`);

    // 1. Evaluate and compute trends
    const trends = await LongitudinalTrendAnalyzer.computeWorkspaceTrends(workspaceId);

    // 2. Scan and match persistent patterns
    const patterns = await PersistentPatternDetector.detectPersistentPatterns(projectId, workspaceId);

    // 3. Process version regressions
    const regressions = await UsabilityRegressionAnalyzer.analyzeRegressions(projectId, workspaceId);

    // 4. Track persona evolutions
    const personas = await PersonaEvolutionTracker.evaluatePersonaEvolution(projectId, workspaceId);

    // 5. Compile longterm behaviors (heatmap coordinate sets)
    const behaviors = await LongtermBehaviorAnalyzer.compileLongtermBehavior(projectId, workspaceId);

    // 6. Project survivabilities
    const survivabilities = await WorkflowSurvivabilityTracker.projectSurvivability(projectId, workspaceId);

    // 7. Analyze element-level signals
    const signals = await LongitudinalSignalAnalyzer.analyzeLongitudinalSignals(projectId, workspaceId);

    // 8. Workspace portfolio health
    const portfolio = await WorkspacePortfolioManager.evaluatePortfolioHealth(workspaceId);

    // 9. Save memory snapshot representing this synthesis run
    const snap = await prisma.uXMemorySnapshot.create({
      data: {
        workspaceId,
        projectId,
        snapshotName: `Longitudinal Synthesis Snapshot`,
        summary: `Complete UX Memory synthesis snapshot captured. Identified ${patterns.length} recurring friction patterns, ${regressions.length} active regressions, and mapped ${personas.length} persona fatigue curves.`,
        patternCount: patterns.length,
        activeRiskCount: regressions.length,
        trendHealth: portfolio.stabilityScore
      }
    });

    return {
      trends,
      patterns,
      regressions,
      personas,
      behaviors,
      survivabilities,
      signals,
      portfolio,
      snapshot: snap
    };
  }
}
