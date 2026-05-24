import { PrismaClient } from '@fricta/db';
import { logger } from '@fricta/shared';

export class AdaptivePrioritizationEngine {
  constructor(private prisma: PrismaClient) {}

  /**
   * Reviews regressions and clusters to build/update agent priorities for upcoming runs.
   */
  async updateAdaptiveProfiles(projectId: string) {
    logger.info({ projectId }, 'AdaptivePrioritizationEngine compiling profiles');

    // 1. Fetch recent regressions
    const regressions = await this.prisma.workflowRegression.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // 2. Fetch recurring patterns
    const patterns = await this.prisma.historicalPattern.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' }
    });

    // Clear existing active profiles so we rebuild clean ones
    await this.prisma.adaptiveSignalProfile.deleteMany({
      where: { projectId }
    });

    const profiles = [];

    // Map patterns/regressions to agent types
    // Rules:
    // - ONBOARDING_FRICTION -> ONBOARDING_AGENT
    // - NAVIGATION_CONFUSION / WORKFLOW_ABANDONMENT -> NAVIGATION_AGENT
    // - CTA_DISCOVERABILITY -> DISCOVERABILITY_AGENT
    // - COGNITIVE_OVERLOAD -> COGNITIVE_AGENT
    // - FORM_COMPLEXITY -> WORKFLOW_AGENT

    const agentActions = [
      {
        patternType: 'ONBOARDING_FRICTION',
        agentType: 'ONBOARDING_AGENT',
        priority: 'CRITICAL',
        trigger: 'Onboarding flows regressed or registered elevated friction.',
        thresholdOverrides: { hesitationDelayMs: 1500, signalSensitivity: 'HIGH' }
      },
      {
        patternType: 'NAVIGATION_CONFUSION',
        agentType: 'NAVIGATION_AGENT',
        priority: 'HIGH',
        trigger: 'Navigation loops and structural layout confusion detected.',
        thresholdOverrides: { clickDelayMs: 800, signalSensitivity: 'HIGH' }
      },
      {
        patternType: 'WORKFLOW_ABANDONMENT',
        agentType: 'NAVIGATION_AGENT',
        priority: 'CRITICAL',
        trigger: 'Frequent session exits detected in previous runs.',
        thresholdOverrides: { pageLoadTimeoutMs: 20000, signalSensitivity: 'HIGH' }
      },
      {
        patternType: 'CTA_DISCOVERABILITY',
        agentType: 'DISCOVERABILITY_AGENT',
        priority: 'HIGH',
        trigger: 'Core Call-To-Action buttons repeatedly bypassed.',
        thresholdOverrides: { decisionDelayThreshold: 2500, signalSensitivity: 'HIGH' }
      },
      {
        patternType: 'COGNITIVE_OVERLOAD',
        agentType: 'COGNITIVE_AGENT',
        priority: 'CRITICAL',
        trigger: 'Decision fatigue or decision overload signals exceeded safety limits.',
        thresholdOverrides: { decisionOverheadWeight: 0.8, signalSensitivity: 'HIGH' }
      },
      {
        patternType: 'FORM_COMPLEXITY',
        agentType: 'WORKFLOW_AGENT',
        priority: 'HIGH',
        trigger: 'Validation errors or layout friction in form blocks.',
        thresholdOverrides: { formVerificationDepth: 'MAXIMUM', signalSensitivity: 'HIGH' }
      }
    ];

    for (const action of agentActions) {
      const hasPattern = patterns.some(p => p.patternType === action.patternType);
      const hasRegression = regressions.some(r => r.metricName === action.patternType || (r.explanation.toLowerCase().includes(action.patternType.toLowerCase().split('_')[0])));

      if (hasPattern || hasRegression) {
        const profile = await this.prisma.adaptiveSignalProfile.create({
          data: {
            projectId,
            agentType: action.agentType,
            targetPriority: action.priority,
            reasonTrigger: action.trigger,
            isActive: true,
            metadata: {
              overrides: action.thresholdOverrides,
              confidence: 0.85,
              evidenceSummary: `Active based on ${hasPattern ? 'recurring patterns' : 'recent metric regression'}.`
            } as any
          }
        });
        profiles.push(profile);
        logger.info({ agentType: action.agentType, priority: action.priority }, 'AdaptiveSignalProfile generated');
      }
    }

    return profiles;
  }
}
