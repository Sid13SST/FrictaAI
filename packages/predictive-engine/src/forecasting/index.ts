import { PrismaClient } from '@fricta/db';
import { RealtimeEventBus } from '@fricta/realtime';
import { SwarmPersonaManager } from '@fricta/swarm-engine';
import { PredictiveConfig } from '../types';
import { HistoricalBaselineManager } from '../baselines';
import { RiskPredictor } from '../risk';
import { RegressionPredictor } from '../regression';
import { SurvivabilityPredictor } from '../survivability';
import { AbandonmentPredictor } from '../abandonment';
import { TimelineRiskPredictor } from '../timelines';

export class PredictiveForecastingEngine {
  private baselineManager: HistoricalBaselineManager;

  constructor(private prisma: PrismaClient) {
    this.baselineManager = new HistoricalBaselineManager(prisma);
  }

  public async execute(config: PredictiveConfig): Promise<any> {
    const { projectId, workflowPath, baselineName = 'V1.0 System Baseline' } = config;

    // 1. Get or create historical baseline
    const baseline = await this.baselineManager.getOrCreateBaseline(projectId, workflowPath, baselineName);

    // 2. Fetch project details
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        historicalPatterns: true,
      },
    });

    if (!project) {
      throw new Error(`Project with ID ${projectId} not found.`);
    }

    // 3. Define mock page elements for visual evaluation depending on target URL
    const isLogin = workflowPath.toLowerCase().includes('login');
    const isPricing = workflowPath.toLowerCase().includes('pricing') || workflowPath.toLowerCase().includes('plan');
    const isCheckout = workflowPath.toLowerCase().includes('checkout') || workflowPath.toLowerCase().includes('cart');

    let elements: any[] = [];
    if (isLogin) {
      elements = [
        { selector: 'input[name="username"]', ctaProminence: 0.3, contrastStrength: 0.8, interactionDensity: 0.2 },
        { selector: 'input[name="password"]', ctaProminence: 0.3, contrastStrength: 0.8, interactionDensity: 0.2 },
        { selector: 'a.forgot-password', ctaProminence: 0.15, contrastStrength: 0.5, interactionDensity: 0.1 },
        { selector: 'button.login-btn', ctaProminence: 0.9, contrastStrength: 0.95, interactionDensity: 0.3 },
      ];
    } else if (isPricing) {
      elements = [
        { selector: 'div.starter-card', ctaProminence: 0.45, contrastStrength: 0.75, interactionDensity: 0.4 },
        { selector: 'button.select-starter', ctaProminence: 0.75, contrastStrength: 0.85, interactionDensity: 0.3 },
        { selector: 'div.pro-card', ctaProminence: 0.65, contrastStrength: 0.9, interactionDensity: 0.5 },
        { selector: 'button.select-pro', ctaProminence: 0.95, contrastStrength: 0.95, interactionDensity: 0.3 },
      ];
    } else if (isCheckout) {
      elements = [
        { selector: 'input[name="email"]', ctaProminence: 0.25, contrastStrength: 0.75, interactionDensity: 0.25 },
        { selector: 'input[name="password"]', ctaProminence: 0.25, contrastStrength: 0.75, interactionDensity: 0.25 },
        { selector: 'a.help-link', ctaProminence: 0.1, contrastStrength: 0.5, interactionDensity: 0.1 },
        { selector: 'button[type="submit"]', ctaProminence: 0.9, contrastStrength: 0.9, interactionDensity: 0.3 },
        { selector: 'div.sidebar-banner', ctaProminence: 0.75, contrastStrength: 0.45, interactionDensity: 0.7 },
      ];
    } else {
      elements = [
        { selector: 'div.hero-header', ctaProminence: 0.35, contrastStrength: 0.8, interactionDensity: 0.3 },
        { selector: 'button.get-started', ctaProminence: 0.95, contrastStrength: 0.95, interactionDensity: 0.2 },
        { selector: 'a.read-more', ctaProminence: 0.2, contrastStrength: 0.6, interactionDensity: 0.15 },
      ];
    }

    // 4. Create parent WorkflowForecast
    const forecast = await this.prisma.workflowForecast.create({
      data: {
        projectId,
        workflowPath,
        status: 'RUNNING',
        stabilityScore: 0.0,
        completionRate: 0.0,
        averageFriction: 0.0,
        failureClusterPoints: [] as any,
        riskLevel: 'LOW',
      },
    });

    // Publish start event
    RealtimeEventBus.getInstance().publish({
      orchestrationSessionId: forecast.id,
      eventType: 'predictive.forecast',
      payload: { status: 'RUNNING', forecastId: forecast.id, step: 'INITIALIZING' },
    });

    // 5. Gather current forecastedStats (simulated or compiled from recent Swarm sessions)
    const recentExecs = await this.prisma.personaExecution.findMany({
      where: {
        swarmSession: { projectId }
      }
    });

    let successRate = 0.72; // slight drop from baseline of 0.85
    let averageSteps = 4.6;
    let averageFriction = 0.44;
    let cognitiveLoadAverage = 0.48;

    if (recentExecs.length > 0) {
      const successes = recentExecs.filter(e => e.status === 'COMPLETED').length;
      successRate = successes / recentExecs.length;
      averageSteps = recentExecs.reduce((sum, e) => sum + e.stepsCompleted, 0) / recentExecs.length;
      averageFriction = recentExecs.reduce((sum, e) => sum + e.frictionScore, 0) / recentExecs.length;
    }

    const forecastedStats = { successRate, averageFriction, cognitiveLoadAverage, averageSteps };

    // Yield short delay for streaming feel
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 6. Calculate Risks
    const riskSignals = RiskPredictor.calculate(workflowPath, forecastedStats, elements);
    for (const sig of riskSignals) {
      await this.prisma.predictiveRiskSignal.create({
        data: {
          workflowForecastId: forecast.id,
          ...sig,
          contributingSignals: sig.contributingSignals as any,
        },
      });

      // Emit realtime update for each risk signal
      RealtimeEventBus.getInstance().publish({
        orchestrationSessionId: forecast.id,
        eventType: 'predictive.risk',
        payload: {
          forecastId: forecast.id,
          risk: sig,
        },
      });
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    // 7. Calculate Regressions
    const regressions = RegressionPredictor.calculate(baseline, forecastedStats);
    for (const reg of regressions) {
      await this.prisma.regressionEvent.create({
        data: {
          projectId,
          workflowPath,
          metricName: reg.metricName,
          baseValue: reg.baseValue,
          forecastedValue: reg.forecastedValue,
          driftPercentage: reg.driftPercentage,
          severity: reg.severity,
          contributingFactors: reg.contributingFactors as any,
          historicalBaselineId: baseline.id,
        },
      });

      // Emit realtime update for each regression event
      RealtimeEventBus.getInstance().publish({
        orchestrationSessionId: forecast.id,
        eventType: 'predictive.regression',
        payload: {
          forecastId: forecast.id,
          regression: reg,
        },
      });
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    // 8. Calculate Survivability Forecasts
    const activePersonas = ['BEGINNER_TEACHER', 'DISTRACTED_STUDENT', 'IMPATIENT_ADMIN', 'POWER_USER'];
    const personasWithTraits = activePersonas.map(key => ({
      displayName: SwarmPersonaManager.getDisplayName(key as any),
      traits: SwarmPersonaManager.getTraits(key as any),
    }));

    const survivabilityForecasts = SurvivabilityPredictor.calculate(personasWithTraits);
    for (const surv of survivabilityForecasts) {
      await this.prisma.survivabilityForecast.create({
        data: {
          workflowForecastId: forecast.id,
          personaType: surv.personaType,
          predictedSurvivalRate: surv.predictedSurvivalRate,
          estimatedStepsToAbandon: surv.estimatedStepsToAbandon,
          primaryAbandonmentTrigger: surv.primaryAbandonmentTrigger,
          riskFactors: surv.riskFactors as any,
        },
      });
    }

    // 9. Calculate Abandonment step predictions
    const defaultTraits = SwarmPersonaManager.getTraits('BEGINNER_TEACHER');
    const abandonmentPredictions = AbandonmentPredictor.calculate(5, averageFriction, defaultTraits);
    for (const ab of abandonmentPredictions) {
      await this.prisma.abandonmentPrediction.create({
        data: {
          workflowForecastId: forecast.id,
          stepIndex: ab.stepIndex,
          abandonmentProbability: ab.abandonmentProbability,
          triggerSource: ab.triggerSource,
          cognitiveLoadEscalation: ab.cognitiveLoadEscalation,
          confidenceCollapseProbability: ab.confidenceCollapseProbability,
          retryDensityImpact: ab.retryDensityImpact,
          hesitationAccumulationMs: ab.hesitationAccumulationMs,
          description: ab.description,
        },
      });
    }

    // 10. Calculate Timeline events
    const timelineEvents = TimelineRiskPredictor.calculate(5, defaultTraits);
    for (const ev of timelineEvents) {
      await this.prisma.predictiveTimelineEvent.create({
        data: {
          workflowForecastId: forecast.id,
          stepIndex: ev.stepIndex,
          eventType: ev.eventType,
          timeOffsetMs: ev.timeOffsetMs,
          predictedIntensity: ev.predictedIntensity,
          description: ev.description,
        },
      });
    }

    // 11. Finalize Parent Forecast
    const stabilityScore = Math.max(0.2, 1.0 - (averageFriction * 0.5) - ((1 - successRate) * 0.8));
    const riskLevel = stabilityScore < 0.4 ? 'CRITICAL' : stabilityScore < 0.6 ? 'HIGH' : stabilityScore < 0.8 ? 'MEDIUM' : 'LOW';
    const failureClusters = elements.filter(el => el.contrastStrength < 0.6 || el.ctaProminence < 0.3).map(el => el.selector);

    const updatedForecast = await this.prisma.workflowForecast.update({
      where: { id: forecast.id },
      data: {
        status: 'COMPLETED',
        stabilityScore,
        completionRate: successRate,
        averageFriction,
        failureClusterPoints: failureClusters as any,
        riskLevel,
      },
    });

    // Publish completed event
    RealtimeEventBus.getInstance().publish({
      orchestrationSessionId: forecast.id,
      eventType: 'predictive.forecast',
      payload: {
        status: 'COMPLETED',
        forecastId: forecast.id,
        stabilityScore,
        riskLevel,
      },
    });

    return updatedForecast;
  }
}
