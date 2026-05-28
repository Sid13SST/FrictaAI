import { prisma } from '@fricta/db';
import { AdaptationRuleSummary } from '../types';

export class AdaptationProcessor {
  /**
   * Evaluates active adaptation rules against project findings and metrics.
   */
  static async evaluateRules(projectId: string, workspaceId: string | null): Promise<AdaptationRuleSummary[]> {
    const rules = await prisma.adaptationRule.findMany({
      where: { projectId, active: true }
    });

    if (rules.length === 0) {
      // Seed default rules if none exist
      return await this.seedDefaultRules(projectId, workspaceId);
    }

    return rules.map(r => ({
      id: r.id,
      ruleKey: r.ruleKey,
      description: r.description,
      triggerSelector: r.triggerSelector,
      thresholdMetric: r.thresholdMetric,
      thresholdValue: r.thresholdValue,
      mitigationValue: r.mitigationValue,
      active: r.active
    }));
  }

  private static async seedDefaultRules(projectId: string, workspaceId: string | null): Promise<AdaptationRuleSummary[]> {
    const defaultRules = [
      {
        projectId,
        workspaceId,
        ruleKey: 'cta-auto-contrast',
        description: 'Auto-adjust primary CTA discovery elements when discoverability friction exceed 40%',
        triggerSelector: 'button.cta-primary',
        thresholdMetric: 'clutterIndex',
        thresholdValue: 40.0,
        mitigationValue: 'contrast:4.8;font-weight:600'
      },
      {
        projectId,
        workspaceId,
        ruleKey: 'onboarding-progressive-disclosure',
        description: 'Enforce progressive form input sections when fatigue index drops below 55%',
        triggerSelector: 'form.onboarding-profile',
        thresholdMetric: 'fatigueDrift',
        thresholdValue: 55.0,
        mitigationValue: 'accordion:progressive;max-steps:3'
      }
    ];

    const createdRules = [];
    for (const rule of defaultRules) {
      const dbRule = await prisma.adaptationRule.create({ data: rule });
      createdRules.push(dbRule);
    }

    return createdRules.map(r => ({
      id: r.id,
      ruleKey: r.ruleKey,
      description: r.description,
      triggerSelector: r.triggerSelector,
      thresholdMetric: r.thresholdMetric,
      thresholdValue: r.thresholdValue,
      mitigationValue: r.mitigationValue,
      active: r.active
    }));
  }
}
