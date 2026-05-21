import { SessionActivityData, SignalSeverity } from '../types';

export interface BehavioralSignal {
  type: 'HESITATION' | 'NAVIGATION_LOOP' | 'INTERACTION_RETRY';
  severity: SignalSeverity;
  stepNumber: number;
  evidence: string;
  metadata?: any;
}

export class BehavioralAnalyzer {
  /**
   * Evaluates the workflow actions, thoughts, and interactions to detect raw behavioral signals.
   */
  static analyze(session: SessionActivityData, idleThresholdMs = 15000): BehavioralSignal[] {
    const signals: BehavioralSignal[] = [];
    const actions = [...session.actions].sort((a, b) => a.stepNumber - b.stepNumber);

    if (actions.length === 0) return [];

    // 1. Hesitation Detection (using duration between action timestamps)
    for (let i = 1; i < actions.length; i++) {
      const prev = actions[i - 1];
      const curr = actions[i];
      const timeDiff = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();

      if (timeDiff > idleThresholdMs) {
        // Also check if the agent thoughts reflected uncertainty/hesitation
        const correspondingThought = session.thoughts.find(t => t.stepNumber === curr.stepNumber);
        const isThoughtConfused = correspondingThought?.thought.toLowerCase().match(/(uncertain|confused|not sure|where to|how to|where is|cant find)/i);

        signals.push({
          type: 'HESITATION',
          severity: timeDiff > 30000 || isThoughtConfused ? 'HIGH' : 'MEDIUM',
          stepNumber: curr.stepNumber,
          evidence: `User paused for ${(timeDiff / 1000).toFixed(1)} seconds before executing step ${curr.stepNumber}.${
            isThoughtConfused ? " Cognitive search keywords detected in thoughts." : ""
          }`,
          metadata: { idleTimeMs: timeDiff, thoughtContent: correspondingThought?.thought }
        });
      }
    }

    // 2. Navigation Loop Detection (repeated URL visits)
    const urls = actions.map(a => {
      const screenshot = session.screenshots.find(s => s.stepIndex === a.stepNumber);
      return { step: a.stepNumber, url: screenshot?.pageUrl || '' };
    }).filter(u => u.url !== '');

    if (urls.length >= 4) {
      // Look for patterns like A -> B -> A -> B or A -> B -> C -> A -> B -> C
      for (let i = 0; i < urls.length - 3; i++) {
        const u0 = urls[i].url;
        const u1 = urls[i + 1].url;
        const u2 = urls[i + 2].url;
        const u3 = urls[i + 3].url;

        // Simple loop of size 2 (A -> B -> A -> B)
        if (u0 === u2 && u1 === u3 && u0 !== u1) {
          signals.push({
            type: 'NAVIGATION_LOOP',
            severity: 'HIGH',
            stepNumber: urls[i + 3].step,
            evidence: `Detected navigation cycling loop between '${u0}' and '${u1}' at step ${urls[i + 3].step}, suggesting menu/routing confusion.`,
            metadata: { loopType: 'A-B-A-B', path: [u0, u1, u2, u3] }
          });
          // Skip past this loop to avoid double-reporting
          i += 2;
        }
      }
    }

    // 3. Interaction Retry Detection (clicking or interacting with same target repeatedly)
    for (let i = 1; i < actions.length; i++) {
      const prev = actions[i - 1];
      const curr = actions[i];

      if (
        prev.action === curr.action &&
        prev.target === curr.target &&
        prev.action !== 'navigate' // Navigate is expected to be sequential
      ) {
        // Find if any thought or error occurred
        const hasError = curr.errorMessage || prev.errorMessage;
        signals.push({
          type: 'INTERACTION_RETRY',
          severity: hasError ? 'CRITICAL' : 'MEDIUM',
          stepNumber: curr.stepNumber,
          evidence: `Repeated interaction with target '${curr.target}' (${curr.action}) at step ${curr.stepNumber}. Previous action was identical.`,
          metadata: { target: curr.target, action: curr.action, hasError: !!hasError }
        });
      }
    }

    return signals;
  }
}
