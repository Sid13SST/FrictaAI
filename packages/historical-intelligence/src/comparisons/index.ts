import { SessionComparisonResult } from '../types';
import { logger } from '@fricta/shared';

export class SessionComparator {
  /**
   * Compares two workflow sessions and outputs structured regression records.
   */
  static compare(baseSession: any, currentSession: any): SessionComparisonResult {
    logger.info(
      { baseId: baseSession.id, currentId: currentSession.id },
      'SessionComparator executing comparison'
    );

    const baseDuration = baseSession.metrics?.duration || 0;
    const currDuration = currentSession.metrics?.duration || 0;
    const durationDelta = currDuration - baseDuration;

    const baseSteps = baseSession.stepCount || 0;
    const currSteps = currentSession.stepCount || 0;
    const stepCountDelta = currSteps - baseSteps;

    const baseCognitiveOverloads = baseSession.cognitiveSignals?.filter((s: any) => s.signalType === 'COGNITIVE_OVERLOAD' && s.intensity > 0.70).length || 0;
    const currCognitiveOverloads = currentSession.cognitiveSignals?.filter((s: any) => s.signalType === 'COGNITIVE_OVERLOAD' && s.intensity > 0.70).length || 0;
    const cognitiveOverloadDelta = currCognitiveOverloads - baseCognitiveOverloads;

    const baseHesitations = baseSession.uxFindings?.filter((f: any) => f.findingType === 'HESITATION').length || 0;
    const currHesitations = currentSession.uxFindings?.filter((f: any) => f.findingType === 'HESITATION').length || 0;
    const hesitationDelta = currHesitations - baseHesitations;

    const regressions: SessionComparisonResult['regressions'] = [];

    // 1. Success rate degradation check
    if (baseSession.status === 'COMPLETED' && currentSession.status !== 'COMPLETED') {
      regressions.push({
        metricName: 'SUCCESS_RATE',
        baseValue: 1.0,
        currentValue: 0.0,
        deltaPercentage: -100,
        explanation: 'Workflow failed to complete in the current version, but completed successfully in the baseline.',
        severity: 'CRITICAL'
      });
    }

    // 2. Step expansion check (more steps means higher navigation overhead)
    if (stepCountDelta > 0) {
      const deltaPct = baseSteps > 0 ? (stepCountDelta / baseSteps) * 100 : 100;
      if (deltaPct >= 20) { // Regresses if step count grows by 20% or more
        regressions.push({
          metricName: 'NAVIGATION_COMPLEXITY',
          baseValue: baseSteps,
          currentValue: currSteps,
          deltaPercentage: parseFloat(deltaPct.toFixed(1)),
          explanation: `Navigation path expanded by ${stepCountDelta} steps (${deltaPct.toFixed(1)}% increase), indicating a more complex interaction loop.`,
          severity: deltaPct >= 50 ? 'HIGH' : 'MEDIUM'
        });
      }
    }

    // 3. Duration delay check (time spent increase)
    if (durationDelta > 0 && baseDuration > 0) {
      const deltaPct = (durationDelta / baseDuration) * 100;
      if (deltaPct >= 30) {
        regressions.push({
          metricName: 'TASK_DURATION',
          baseValue: baseDuration,
          currentValue: currDuration,
          deltaPercentage: parseFloat(deltaPct.toFixed(1)),
          explanation: `Task completion duration delayed by ${durationDelta} seconds (${deltaPct.toFixed(1)}% slower).`,
          severity: deltaPct >= 60 ? 'HIGH' : 'MEDIUM'
        });
      }
    }

    // 4. Cognitive load check
    if (cognitiveOverloadDelta > 0) {
      const deltaPct = baseCognitiveOverloads > 0 ? (cognitiveOverloadDelta / baseCognitiveOverloads) * 100 : 100;
      regressions.push({
        metricName: 'COGNITIVE_LOAD',
        baseValue: baseCognitiveOverloads,
        currentValue: currCognitiveOverloads,
        deltaPercentage: parseFloat(deltaPct.toFixed(1)),
        explanation: `Cognitive overload signals increased by ${cognitiveOverloadDelta} flags compared to the baseline.`,
        severity: currCognitiveOverloads > 3 ? 'HIGH' : 'MEDIUM'
      });
    }

    // 5. Hesitations check
    if (hesitationDelta > 0) {
      const deltaPct = baseHesitations > 0 ? (hesitationDelta / baseHesitations) * 100 : 100;
      regressions.push({
        metricName: 'USER_HESITATION',
        baseValue: baseHesitations,
        currentValue: currHesitations,
        deltaPercentage: parseFloat(deltaPct.toFixed(1)),
        explanation: `User hesitations increased by ${hesitationDelta} points, showing potential discoverability friction.`,
        severity: 'LOW'
      });
    }

    return {
      baseSessionId: baseSession.id,
      compareSessionId: currentSession.id,
      metricDeltas: {
        durationDelta,
        stepCountDelta,
        cognitiveOverloadDelta,
        hesitationDelta
      },
      regressions
    };
  }
}
