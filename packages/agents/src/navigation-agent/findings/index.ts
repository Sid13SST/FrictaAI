import { StructuredFinding, EmittedSignal } from '../../shared';

export class NavigationFindings {
  static compile(signals: EmittedSignal[]): StructuredFinding[] {
    const findings: StructuredFinding[] = [];

    const loop = signals.find(s => s.signalType === 'NAVIGATION_LOOP_SIGNAL');
    const routeSwitch = signals.find(s => s.signalType === 'ROUTE_SWITCH_FRICTION');
    const deadEnd = signals.find(s => s.signalType === 'DEAD_END_NAVIGATION');
    const sidebar = signals.find(s => s.signalType === 'SIDEBAR_COMPLEXITY');
    const branching = signals.find(s => s.signalType === 'WORKFLOW_BRANCHING_CONFUSION');

    if (loop) {
      findings.push({
        findingType: 'NAVIGATION_LOOP',
        severity: 'HIGH',
        title: 'Repetitive Navigation Loop Detected',
        description: 'User repeatedly toggled between the same pages, showing route confusion.',
        evidence: `Loop sequence: ${loop.metadata.path.join(' ➔ ')}`
      });
    }

    if (routeSwitch && routeSwitch.intensity > 0.6) {
      findings.push({
        findingType: 'ROUTE_SWITCH_FRICTION',
        severity: 'MEDIUM',
        title: 'High Route-Switching Friction',
        description: 'Users repeatedly switch between pages/tabs before locating the workflow entry point, indicating poor navigation clarity.',
        evidence: `${routeSwitch.metadata.consecutiveSwitches} consecutive navigations without interaction.`
      });
    }

    if (deadEnd) {
      findings.push({
        findingType: 'DEAD_END',
        severity: 'CRITICAL',
        title: 'Workflow Terminated at Dead End',
        description: 'The user reached a step where they could not progress due to layout dead ends or failed action status.',
        evidence: `Session ended abruptly at action step ${deadEnd.metadata.lastStep}.`
      });
    }

    if (sidebar && sidebar.intensity > 0.6) {
      findings.push({
        findingType: 'IA_CONFUSION',
        severity: 'LOW',
        title: 'High Sidebar Layout Density',
        description: 'Sidebar navigation has too many items, increasing search time and visual load.',
        evidence: `Detected ${sidebar.metadata.elementCount} links inside the primary sidebar container.`
      });
    }

    if (branching) {
      findings.push({
        findingType: 'IA_CONFUSION',
        severity: 'MEDIUM',
        title: 'Workflow Branching Confusion',
        description: 'User repeatedly bounced between dashboard hubs and setup forms, suggesting setup progress is unclear.',
        evidence: `Switched between dashboard (${branching.metadata.dashboardSwitches}x) and setup (${branching.metadata.setupSwitches}x) repeatedly.`
      });
    }

    return findings;
  }
}
