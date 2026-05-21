import { EmittedSignal } from '../../shared';
import { WorkflowHeuristics } from '../heuristics';

export class WorkflowSignals {
  static compute(sessionData: any): EmittedSignal[] {
    const signals: EmittedSignal[] = [];
    const actions = sessionData.actions || [];
    const metrics = sessionData.metrics || {};

    // 1. Redundant Clicks / Actions
    const redundancy = WorkflowHeuristics.detectStepRedundancy(actions);
    if (redundancy.redundantCount > 0) {
      signals.push({
        signalType: 'STEP_REDUNDANCY',
        intensity: Math.min(1.0, 0.4 + redundancy.redundantCount * 0.2),
        metadata: { redundantTargets: redundancy.targets }
      });
    }

    // 2. Workflow Bottlenecks
    const bottleneck = WorkflowHeuristics.detectBottlenecks(actions, metrics);
    if (bottleneck.hasBottleneck) {
      signals.push({
        signalType: 'WORKFLOW_BOTTLENECK',
        intensity: Math.min(1.0, 0.5 + (bottleneck.avgStepDuration - 20) * 0.02),
        metadata: { reason: bottleneck.reason, avgStepDuration: bottleneck.avgStepDuration }
      });
    }

    // 3. Excessive Steps
    const optimization = WorkflowHeuristics.detectStepCountOptimizations(actions);
    if (optimization.needsOptimization) {
      signals.push({
        signalType: 'EXCESSIVE_WORKFLOW_STEPS',
        intensity: Math.min(1.0, 0.5 + (optimization.stepCount - 15) * 0.03),
        metadata: { stepCount: optimization.stepCount }
      });
    }

    return signals;
  }
}
export default WorkflowSignals;
