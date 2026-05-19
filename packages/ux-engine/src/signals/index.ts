import { SessionData, UXSignal, ActionData, InteractionData } from '../types';

const HESITATION_THRESHOLD_MS = 15000; // 15 seconds

export function detectSignals(session: SessionData): UXSignal[] {
  const signals: UXSignal[] = [];

  // Sort chronologically just in case
  const sortedActions = [...session.actions].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const sortedInteractions = [...session.interactions].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // 1. Hesitation Signal
  // Detect unusually long pauses between actions
  for (let i = 1; i < sortedActions.length; i++) {
    const prevAction = sortedActions[i - 1];
    const currAction = sortedActions[i];
    const delay = currAction.timestamp.getTime() - prevAction.timestamp.getTime();

    if (delay > HESITATION_THRESHOLD_MS) {
      signals.push({
        signalType: 'HESITATION',
        severity: delay > 30000 ? 'HIGH' : 'MEDIUM',
        metadata: {
          delayMs: delay,
          beforeAction: currAction.action,
          target: currAction.target,
        },
        timestamp: currAction.timestamp,
      });
    }
  }

  // 2. Repeated Action Signal & Dead-End Signal
  // Detect repeated failed interactions or repeated clicks
  const actionCounts = new Map<string, number>();
  const failedActions = new Map<string, number>();
  
  for (const action of sortedActions) {
    const key = `${action.action}:${action.target}`;
    if (action.status === 'failed') {
      failedActions.set(key, (failedActions.get(key) || 0) + 1);
    }
    actionCounts.set(key, (actionCounts.get(key) || 0) + 1);
  }

  failedActions.forEach((count, key) => {
    if (count > 1) {
      signals.push({
        signalType: 'REPEATED_ACTION',
        severity: count > 3 ? 'HIGH' : 'MEDIUM',
        metadata: {
          key,
          failedCount: count,
          reason: 'repeated failures',
        },
        timestamp: sortedActions[sortedActions.length - 1].timestamp,
      });
    }
  });

  actionCounts.forEach((count, key) => {
    if (count > 3 && !failedActions.has(key)) {
      // e.g. clicking the same thing over and over
      signals.push({
        signalType: 'REPEATED_ACTION',
        severity: count > 5 ? 'HIGH' : 'LOW',
        metadata: {
          key,
          count,
          reason: 'repetitive interaction',
        },
        timestamp: sortedActions[sortedActions.length - 1].timestamp,
      });
    }
  });

  // 3. Navigation Loop Signal
  // Look at page transitions in interactions (if available) or assume navigation from specific actions
  const pageTransitions = sortedInteractions.filter((i) => i.type === 'navigation' || i.type === 'url_change');
  const pageVisits = new Map<string, number>();
  for (const t of pageTransitions) {
    const url = t.metadata?.url || t.target;
    pageVisits.set(url, (pageVisits.get(url) || 0) + 1);
  }

  pageVisits.forEach((count, url) => {
    if (count >= 3) {
      signals.push({
        signalType: 'NAVIGATION_LOOP',
        severity: count > 4 ? 'HIGH' : 'MEDIUM',
        metadata: {
          url,
          visits: count,
        },
        timestamp: pageTransitions[pageTransitions.length - 1].timestamp,
      });
    }
  });

  // 4. Dead-End Signal (Pages with no meaningful progress)
  // E.g., multiple thoughts but no successful actions
  if (session.thoughts.length > 5 && sortedActions.filter(a => a.status === 'success').length === 0) {
    signals.push({
      signalType: 'DEAD_END',
      severity: 'HIGH',
      metadata: {
        thoughtsCount: session.thoughts.length,
      },
      timestamp: new Date(),
    });
  }

  // 5. Excessive Scroll Signal
  const scrollEvents = sortedInteractions.filter(i => i.type === 'scroll');
  if (scrollEvents.length > 10) {
    signals.push({
      signalType: 'EXCESSIVE_SCROLL',
      severity: scrollEvents.length > 20 ? 'HIGH' : 'MEDIUM',
      metadata: {
        scrollCount: scrollEvents.length,
      },
      timestamp: scrollEvents[scrollEvents.length - 1].timestamp,
    });
  }

  // 6. Workflow Efficiency Signal
  if (session.actions.length > 20) {
    signals.push({
      signalType: 'WORKFLOW_EFFICIENCY',
      severity: 'MEDIUM',
      metadata: {
        totalSteps: session.actions.length,
        issue: 'excessive steps',
      },
      timestamp: new Date(),
    });
  }

  return signals;
}
