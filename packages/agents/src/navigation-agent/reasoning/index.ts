import { ReasoningStep, EmittedSignal } from '../../shared';

export class NavigationReasoning {
  static evaluate(signals: EmittedSignal[]): ReasoningStep[] {
    const traces: ReasoningStep[] = [];

    traces.push({
      stepType: 'HEURISTIC_EVALUATION',
      summary: 'Evaluated route history and layout navigation elements to detect loop patterns or IA clutter.',
      evidence: `Analyzed session containing ${signals.length} active navigation signals.`
    });

    const loop = signals.find(s => s.signalType === 'NAVIGATION_LOOP_SIGNAL');
    const routeSwitch = signals.find(s => s.signalType === 'ROUTE_SWITCH_FRICTION');
    const deadEnd = signals.find(s => s.signalType === 'DEAD_END_NAVIGATION');
    const sidebar = signals.find(s => s.signalType === 'SIDEBAR_COMPLEXITY');

    if (loop) {
      traces.push({
        stepType: 'EVIDENCE_CORRELATION',
        summary: `Detected navigation loop pattern where user traversed route sequence repeatedly: ${JSON.stringify(loop.metadata.path)}.`,
        evidence: 'User navigated back and forth between identical pages, indicating they could not find the primary task driver.'
      });
    }

    if (routeSwitch && routeSwitch.intensity > 0.6) {
      traces.push({
        stepType: 'EVIDENCE_CORRELATION',
        summary: `Detected heavy route switching friction with ${routeSwitch.metadata.consecutiveSwitches} consecutive navigate steps without form interactions.`,
        evidence: 'Frequent tab switching without input or button submit indicates search fatigue or interface confusion.'
      });
    }

    if (deadEnd) {
      traces.push({
        stepType: 'EVIDENCE_CORRELATION',
        summary: 'Detected workflow terminating on a dead-end or failed action step.',
        evidence: `Last step was marked as failed, blocking user progression.`
      });
    }

    if (sidebar && sidebar.intensity > 0.6) {
      traces.push({
        stepType: 'EVIDENCE_CORRELATION',
        summary: `Flagged excessive sidebar links (${sidebar.metadata.elementCount}) causing clutter in main navigation regions.`,
        evidence: 'Too many high-level menu items reduces discoverability of primary workflows.'
      });
    }

    return traces;
  }
}
