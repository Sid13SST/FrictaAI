export class DivergenceEngine {
  /**
   * Compares persona execution paths against a baseline (defaulting to POWER_USER)
   * to detect click/input/navigation differences.
   */
  public static detect(
    swarmSessionId: string,
    executions: Array<{ personaType: string; steps: any[] }>
  ): any[] {
    const events: any[] = [];
    if (executions.length < 2) return [];

    // Prioritize Power User as baseline to compare onboarding efficiency
    const baseline =
      executions.find((e) => e.personaType === 'POWER_USER' || e.personaType === 'Power User') ||
      executions[0];

    for (const exec of executions) {
      if (exec.personaType === baseline.personaType) continue;

      const maxSteps = Math.max(baseline.steps.length, exec.steps.length);
      for (let stepIndex = 0; stepIndex < maxSteps; stepIndex++) {
        const stepA = baseline.steps[stepIndex];
        const stepB = exec.steps[stepIndex];

        if (!stepA && stepB) {
          events.push({
            swarmSessionId,
            stepIndex,
            eventType: 'PATH_DIVERGENCE',
            selector: stepB.targetSelector || null,
            personaTypeA: baseline.personaType,
            actionA: 'SESSION_COMPLETE',
            personaTypeB: exec.personaType,
            actionB: stepB.eventType,
            details: `${exec.personaType} continued exploring (performed ${stepB.eventType} on ${stepB.targetSelector || 'viewport'}) after ${baseline.personaType} had finished.`,
          });
          break;
        } else if (stepA && !stepB) {
          events.push({
            swarmSessionId,
            stepIndex,
            eventType: 'ABANDONMENT',
            selector: stepA.targetSelector || null,
            personaTypeA: baseline.personaType,
            actionA: stepA.eventType,
            personaTypeB: exec.personaType,
            actionB: 'ABANDONED',
            details: `${exec.personaType} abandoned the session at step ${stepIndex + 1}, whereas ${baseline.personaType} successfully executed ${stepA.eventType} on ${stepA.targetSelector || 'viewport'}.`,
          });
          break;
        } else if (stepA && stepB) {
          if (
            stepA.targetSelector !== stepB.targetSelector ||
            stepA.eventType !== stepB.eventType
          ) {
            events.push({
              swarmSessionId,
              stepIndex,
              eventType: 'PATH_DIVERGENCE',
              selector: stepB.targetSelector || null,
              personaTypeA: baseline.personaType,
              actionA: `${stepA.eventType} on ${stepA.targetSelector || 'viewport'}`,
              personaTypeB: exec.personaType,
              actionB: `${stepB.eventType} on ${stepB.targetSelector || 'viewport'}`,
              details: `Behavior split at step ${stepIndex + 1}: ${baseline.personaType} did ${stepA.eventType} on "${stepA.targetSelector}", while ${exec.personaType} diverted by performing ${stepB.eventType} on "${stepB.targetSelector}".`,
            });
          }
        }
      }
    }

    return events;
  }
}
