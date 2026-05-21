import { SessionActivityData, CognitiveSignalData } from '../types';
import { BehavioralSignal } from '../behavior';

export class CognitiveEngine {
  /**
   * Computes the 5 dimensions of cognitive burden.
   */
  static calculate(session: SessionActivityData, behavioralSignals: BehavioralSignal[]): CognitiveSignalData[] {
    const signals: CognitiveSignalData[] = [];
    const sessionId = session.id;

    // Helper thresholds
    const actionsCount = session.actions.length;
    const errorsCount = session.actions.filter(a => a.status === 'failed' || a.errorMessage).length;
    const hesitations = behavioralSignals.filter(s => s.type === 'HESITATION');
    const loops = behavioralSignals.filter(s => s.type === 'NAVIGATION_LOOP');
    const retries = behavioralSignals.filter(s => s.type === 'INTERACTION_RETRY');

    // 1. Cognitive Overload
    // Influenced by element counts, error rates, and retries
    let overloadIntensity = 0.1;
    overloadIntensity += Math.min(0.4, errorsCount * 0.15);
    overloadIntensity += Math.min(0.3, retries.length * 0.1);
    overloadIntensity += Math.min(0.2, hesitations.length * 0.05);
    overloadIntensity = Math.min(1.0, overloadIntensity);

    signals.push({
      workflowSessionId: sessionId,
      signalType: 'COGNITIVE_OVERLOAD',
      intensity: Math.round(overloadIntensity * 100) / 100,
      metadata: { errorsCount, retriesCount: retries.length, hesitationsCount: hesitations.length }
    });

    // 2. Decision Fatigue
    // Influenced by the maximum interactive elements visible in layout schemas
    let maxInteractiveElements = 0;
    session.screenshots.forEach(shot => {
      const elements = shot.metadata?.elements || [];
      const interactive = elements.filter((el: any) => 
        ['button', 'input', 'select', 'textarea', 'a'].includes(el.tagName?.toLowerCase()) || 
        el.role === 'button' || el.role === 'link' || el.role === 'textbox'
      );
      if (interactive.length > maxInteractiveElements) {
        maxInteractiveElements = interactive.length;
      }
    });

    // If maxInteractiveElements is 0, infer from action target variety
    if (maxInteractiveElements === 0) {
      const uniqueTargets = new Set(session.actions.map(a => a.target));
      maxInteractiveElements = Math.max(4, uniqueTargets.size * 2);
    }

    const fatigueIntensity = Math.min(1.0, maxInteractiveElements / 15.0);
    signals.push({
      workflowSessionId: sessionId,
      signalType: 'DECISION_FATIGUE',
      intensity: Math.round(fatigueIntensity * 100) / 100,
      metadata: { maxInteractiveElements }
    });

    // 3. Workflow Density
    // Derived from action counts compared to average expected steps (normally ~5-6 steps)
    const densityIntensity = Math.min(1.0, actionsCount / 12.0);
    signals.push({
      workflowSessionId: sessionId,
      signalType: 'WORKFLOW_DENSITY',
      intensity: Math.round(densityIntensity * 100) / 100,
      metadata: { totalSteps: actionsCount }
    });

    // 4. Discoverability Friction
    // Influenced by hesitation counts and scrolling behavior (simulated or explicit in actions)
    const hasScrolls = session.actions.some(a => a.action?.toLowerCase().includes('scroll'));
    let discoverabilityIntensity = Math.min(0.8, hesitations.length * 0.2);
    if (hasScrolls) discoverabilityIntensity += 0.2;
    discoverabilityIntensity = Math.min(1.0, discoverabilityIntensity + (loops.length > 0 ? 0.1 : 0.0));

    signals.push({
      workflowSessionId: sessionId,
      signalType: 'DISCOVERABILITY_FRICTION',
      intensity: Math.round(discoverabilityIntensity * 100) / 100,
      metadata: { hesitationsCount: hesitations.length, hasScrolls }
    });

    // 5. Branching Depth
    // Influenced by navigation loops and unique routes visited
    const uniqueRoutes = new Set(session.screenshots.map(s => s.pageUrl).filter(Boolean));
    let branchingIntensity = Math.min(0.5, uniqueRoutes.size / 6.0);
    branchingIntensity += Math.min(0.5, loops.length * 0.2);
    branchingIntensity = Math.min(1.0, branchingIntensity);

    signals.push({
      workflowSessionId: sessionId,
      signalType: 'BRANCHING_DEPTH',
      intensity: Math.round(branchingIntensity * 100) / 100,
      metadata: { uniqueRoutesCount: uniqueRoutes.size, navigationLoopsCount: loops.length }
    });

    return signals;
  }
}
