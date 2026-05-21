export class WorkflowHeuristics {
  static detectStepRedundancy(actions: any[]): { redundantCount: number; targets: string[] } {
    const clickTargets = actions
      .filter(a => a.action === 'click')
      .map(a => a.target);

    // Count duplicate target clicks
    const targetCounts: { [key: string]: number } = {};
    for (const t of clickTargets) {
      if (t) {
        targetCounts[t] = (targetCounts[t] || 0) + 1;
      }
    }

    const redundantTargets = Object.entries(targetCounts)
      .filter(([_, count]) => count > 2)
      .map(([target]) => target);

    return {
      redundantCount: redundantTargets.length,
      targets: redundantTargets
    };
  }

  static detectBottlenecks(actions: any[], metrics: any): { hasBottleneck: boolean; reason: string; avgStepDuration: number } {
    const duration = metrics?.duration || 0;
    const count = actions.length;

    if (count === 0) return { hasBottleneck: false, reason: '', avgStepDuration: 0 };

    const avgStepDuration = duration / count;

    // If average duration per step is greater than 20 seconds, flag a bottleneck
    if (avgStepDuration > 20) {
      return {
        hasBottleneck: true,
        reason: `Average interaction duration is high: ${avgStepDuration.toFixed(1)}s per step`,
        avgStepDuration
      };
    }

    return { hasBottleneck: false, reason: '', avgStepDuration };
  }

  static detectStepCountOptimizations(actions: any[]): { needsOptimization: boolean; stepCount: number } {
    const count = actions.length;
    // Workflows requiring more than 15 actions to complete are prime candidates for optimization
    return {
      needsOptimization: count > 15,
      stepCount: count
    };
  }
}
export default WorkflowHeuristics;
