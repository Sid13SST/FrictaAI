import { EmittedSignal } from '../../shared';
import { CognitiveHeuristics } from '../heuristics';

export class CognitiveSignals {
  static compute(sessionData: any): EmittedSignal[] {
    const signals: EmittedSignal[] = [];
    const actions = sessionData.actions || [];
    const screenshots = sessionData.screenshots || [];
    const thoughts = sessionData.thoughts || [];

    // 1. Cognitive Overload
    const hesitationCount = CognitiveHeuristics.detectHesitationPatterns(thoughts);
    if (hesitationCount > 1 || actions.length > 12) {
      signals.push({
        signalType: 'COGNITIVE_OVERLOAD',
        intensity: Math.min(1.0, 0.4 + hesitationCount * 0.15 + (actions.length > 12 ? 0.2 : 0)),
        metadata: { hesitantThoughts: hesitationCount, totalSteps: actions.length }
      });
    }

    // 2. Decision Fatigue
    const decisionChain = CognitiveHeuristics.detectDecisionFatigue(actions);
    if (decisionChain > 3) {
      signals.push({
        signalType: 'DECISION_FATIGUE',
        intensity: Math.min(1.0, 0.4 + (decisionChain - 3) * 0.15),
        metadata: { consecutiveDecisions: decisionChain }
      });
    }

    // 3. Workflow Density
    const inputsPerView = CognitiveHeuristics.detectWorkflowDensity(screenshots);
    if (inputsPerView > 6) {
      signals.push({
        signalType: 'WORKFLOW_DENSITY',
        intensity: Math.min(1.0, 0.5 + (inputsPerView - 6) * 0.08),
        metadata: { maxInputsInSingleView: inputsPerView }
      });
    }

    // 4. Excessive Step Complexity
    if (actions.length > 10) {
      signals.push({
        signalType: 'EXCESSIVE_STEP_COMPLEXITY',
        intensity: Math.min(1.0, 0.5 + (actions.length - 10) * 0.05),
        metadata: { totalStepCount: actions.length }
      });
    }

    return signals;
  }
}
export default CognitiveSignals;
