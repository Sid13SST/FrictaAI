import { EmittedSignal } from '../../shared';
import { NavigationHeuristics } from '../heuristics';

export class NavigationSignals {
  static compute(sessionData: any): EmittedSignal[] {
    const signals: EmittedSignal[] = [];
    const actions = sessionData.actions || [];
    const screenshots = sessionData.screenshots || [];

    // 1. Navigation Loop
    const loopRes = NavigationHeuristics.detectLoops(actions);
    if (loopRes.loopFound) {
      signals.push({
        signalType: 'NAVIGATION_LOOP_SIGNAL',
        intensity: 0.9,
        metadata: { path: loopRes.path }
      });
    }

    // 2. Route Switching Friction
    const switchCount = NavigationHeuristics.detectRouteSwitchFriction(actions);
    if (switchCount > 2) {
      signals.push({
        signalType: 'ROUTE_SWITCH_FRICTION',
        intensity: Math.min(1.0, 0.3 * switchCount),
        metadata: { consecutiveSwitches: switchCount }
      });
    }

    // 3. Dead-End Navigation
    const deadEnd = NavigationHeuristics.detectDeadEnds(actions);
    if (deadEnd) {
      signals.push({
        signalType: 'DEAD_END_NAVIGATION',
        intensity: 0.85,
        metadata: { lastStep: actions.length }
      });
    }

    // 4. Sidebar Complexity
    const sidebarCount = NavigationHeuristics.getSidebarComplexity(screenshots);
    if (sidebarCount > 8) {
      signals.push({
        signalType: 'SIDEBAR_COMPLEXITY',
        intensity: Math.min(1.0, 0.4 + (sidebarCount - 8) * 0.05),
        metadata: { elementCount: sidebarCount }
      });
    }

    // 5. Workflow Branching Confusion
    // Triggers when user navigates between dashboard and setup routes back and forth
    const pageSwitches = actions.filter((a: any) => a.action === 'navigate').map((a: any) => a.value || '');
    const setupSwitchCount = pageSwitches.filter((p: any) => p.includes('setup') || p.includes('create') || p.includes('edit')).length;
    const dashboardSwitchCount = pageSwitches.filter((p: any) => p.includes('dashboard') || p.includes('home')).length;
    
    if (setupSwitchCount > 1 && dashboardSwitchCount > 1) {
      signals.push({
        signalType: 'WORKFLOW_BRANCHING_CONFUSION',
        intensity: 0.75,
        metadata: { setupSwitches: setupSwitchCount, dashboardSwitches: dashboardSwitchCount }
      });
    }

    return signals;
  }
}
