import { PrismaClient } from '@fricta/db';
import { logger } from '@fricta/shared';

import { HistoricalMemoryManager } from './memory';
import { PatternDetectionEngine } from './patterns';
import { RegressionTracker } from './regressions';
import { PersonaTrendTracker } from './personas';
import { OrganizationalAnalyticsManager } from './analytics';
import { AdaptivePrioritizationEngine } from './adaptation';
import { WorkflowTimelineBuilder } from './timelines';

export * from './types';
export * from './memory';
export * from './comparisons';
export * from './patterns';
export * from './regressions';
export * from './personas';
export * from './signals';
export * from './timelines';
export * from './analytics';
export * from './adaptation';

export class HistoricalIntelligencePipeline {
  private memoryManager: HistoricalMemoryManager;
  private regressionTracker: RegressionTracker;
  private personaTracker: PersonaTrendTracker;
  private analyticsManager: OrganizationalAnalyticsManager;
  private adaptiveEngine: AdaptivePrioritizationEngine;

  constructor(private prisma: PrismaClient) {
    this.memoryManager = new HistoricalMemoryManager(prisma);
    this.regressionTracker = new RegressionTracker(prisma);
    this.personaTracker = new PersonaTrendTracker(prisma);
    this.analyticsManager = new OrganizationalAnalyticsManager(prisma);
    this.adaptiveEngine = new AdaptivePrioritizationEngine(prisma);
  }

  /**
   * Executes the full learning and historical intelligence pipeline.
   */
  async runPipeline(projectId: string, latestSessionId: string, customBaselineId?: string) {
    logger.info({ projectId, latestSessionId, customBaselineId }, 'HistoricalIntelligencePipeline initiating execution');

    try {
      // 1. Run Regression Tracker
      logger.info('Pipeline execution: tracking regressions...');
      const regressions = await this.regressionTracker.trackRegressions(projectId, latestSessionId, customBaselineId);

      // 2. Fetch all project sessions for pattern/trend extraction
      const sessions = await this.memoryManager.getProjectSessions(projectId);

      // 3. Run Pattern Detection Engine
      logger.info('Pipeline execution: running pattern detection...');
      const patterns = PatternDetectionEngine.detect(sessions);

      // Save/overwrite patterns in database
      await this.prisma.historicalPattern.deleteMany({
        where: { projectId }
      });
      for (const p of patterns) {
        await this.prisma.historicalPattern.create({
          data: {
            projectId,
            patternType: p.patternType,
            name: p.name,
            description: p.description,
            severity: p.severity,
            confidence: p.confidence,
            frequency: p.affectedSessions.length,
            affectedSessions: p.affectedSessions,
            evidenceSummary: p.evidenceSummary
          }
        });
      }

      // 4. Run Persona Trends
      logger.info('Pipeline execution: tracking persona trends...');
      await this.personaTracker.trackPersonaTrends(projectId);

      // 5. Generate Organizational Insights & Stability Heatmap
      logger.info('Pipeline execution: generating organizational insights...');
      await this.analyticsManager.generateAnalytics(projectId, sessions);

      // 6. Update Adaptive prioritizations
      logger.info('Pipeline execution: compiling adaptive prioritization rules...');
      const adaptiveProfiles = await this.adaptiveEngine.updateAdaptiveProfiles(projectId);

      logger.info(
        { regressionsCount: regressions.length, patternsCount: patterns.length, adaptiveProfilesCount: adaptiveProfiles.length },
        'HistoricalIntelligencePipeline completed successfully'
      );

      return {
        success: true,
        regressions,
        patterns,
        adaptiveProfiles
      };
    } catch (err: any) {
      logger.error({ err: err.message }, 'HistoricalIntelligencePipeline failed to execute');
      throw err;
    }
  }
}
