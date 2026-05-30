import { prisma } from '@fricta/db';

export class SurvivabilityMonitor {
  /**
   * Tracks and stores live survivability metrics for various key user paths.
   * Outputs values from 0.0 (total failure/blocker) to 1.0 (smooth completion).
   */
  public static async calculateMetrics(projectId: string): Promise<Record<string, number>> {
    const windowStart = new Date(Date.now() - 15 * 60 * 1000); // 15-minute sliding window

    const sessions = await prisma.liveSession.findMany({
      where: {
        projectId,
        lastActiveAt: { gte: windowStart },
      },
      include: {
        navigationEvents: true,
        interactionEvents: true,
        frictionSignals: true,
      },
    });

    const activeCount = sessions.length;
    if (activeCount === 0) {
      return {
        onboarding: 1.0,
        cta: 1.0,
        navigation: 1.0,
        workflow: 1.0,
        cognitive: 1.0,
      };
    }

    // 1. Onboarding Survivability: conversion from /onboarding to /dashboard
    const startedOnboarding = sessions.filter((s) =>
      s.navigationEvents.some((n) => n.fromUrl.includes('/onboarding') || n.toUrl.includes('/onboarding'))
    );
    const completedOnboarding = startedOnboarding.filter((s) =>
      s.navigationEvents.some((n) => n.toUrl.includes('/dashboard') || n.toUrl.includes('/app'))
    );
    const onboardingScore = startedOnboarding.length > 0 
      ? completedOnboarding.length / startedOnboarding.length 
      : 1.0;

    // 2. CTA Survivability: clicks that did NOT experience rage click or errors
    const totalClicks = sessions.reduce((acc, s) => acc + s.interactionEvents.filter(i => i.action === 'CLICK').length, 0);
    const rageClicks = sessions.reduce((acc, s) => acc + s.frictionSignals.filter(f => f.frictionType === 'RAGE_CLICK').length, 0);
    const ctaScore = totalClicks > 0 
      ? Math.max(0.0, 1.0 - (rageClicks * 1.5) / totalClicks) 
      : 1.0;

    // 3. Navigation Survivability: rate of sessions free of loops
    const loopSessions = sessions.filter((s) => {
      const navs = s.navigationEvents;
      if (navs.length < 4) return false;
      let looped = false;
      for (let i = 0; i <= navs.length - 4; i++) {
        if (navs[i].toUrl === navs[i+2].toUrl && navs[i].fromUrl === navs[i+2].fromUrl && navs[i+1].toUrl === navs[i+3].toUrl) {
          looped = true;
          break;
        }
      }
      return looped;
    });
    const navigationScore = Math.max(0.0, 1.0 - loopSessions.length / activeCount);

    // 4. Workflow Survivability: checkout/conversion workflow completion index
    const startedCheckout = sessions.filter((s) =>
      s.navigationEvents.some((n) => n.toUrl.includes('/checkout'))
    );
    const completedCheckout = startedCheckout.filter((s) =>
      s.navigationEvents.some((n) => n.toUrl.includes('/success') || n.toUrl.includes('/complete'))
    );
    const workflowScore = startedCheckout.length > 0 
      ? completedCheckout.length / startedCheckout.length 
      : 1.0;

    // 5. Cognitive Survivability: inverted cognitive friction index
    const averageFriction = sessions.reduce((acc, s) => {
      const fScore = s.frictionSignals.length * 0.25;
      return acc + Math.min(1.0, fScore);
    }, 0) / activeCount;
    const cognitiveScore = Math.max(0.0, 1.0 - averageFriction);

    // Write computed metrics to the database
    const metricsToWrite = [
      { type: 'ONBOARDING_SURVIVABILITY', val: onboardingScore, workflow: 'onboarding' },
      { type: 'CTA_SURVIVABILITY', val: ctaScore, workflow: 'primary-cta' },
      { type: 'NAVIGATION_SURVIVABILITY', val: navigationScore, workflow: 'routing' },
      { type: 'WORKFLOW_SURVIVABILITY', val: workflowScore, workflow: 'checkout' },
      { type: 'COGNITIVE_SURVIVABILITY', val: cognitiveScore, workflow: 'cognitive' },
    ];

    for (const m of metricsToWrite) {
      await prisma.survivabilityMetric.create({
        data: {
          projectId,
          metricType: m.type,
          value: m.val,
          targetWorkflow: m.workflow,
        },
      });
    }

    return {
      onboarding: onboardingScore,
      cta: ctaScore,
      navigation: navigationScore,
      workflow: workflowScore,
      cognitive: cognitiveScore,
    };
  }
}
