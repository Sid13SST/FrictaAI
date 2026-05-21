import { StructuredFinding, EmittedSignal } from '../../shared';

export class WorkflowFindings {
  static compile(signals: EmittedSignal[]): StructuredFinding[] {
    const findings: StructuredFinding[] = [];

    const redundancy = signals.find(s => s.signalType === 'STEP_REDUNDANCY');
    const bottleneck = signals.find(s => s.signalType === 'WORKFLOW_BOTTLENECK');
    const steps = signals.find(s => s.signalType === 'EXCESSIVE_WORKFLOW_STEPS');

    if (redundancy && redundancy.intensity > 0.5) {
      findings.push({
        findingType: 'STEP_REDUNDANCY',
        severity: 'MEDIUM',
        title: 'Interaction Redundancy Detected',
        description: 'The user clicked or interacted with the same target element multiple times in rapid succession, suggesting missing visual feedback or slow system responsiveness.',
        evidence: `Repeated targets: ${redundancy.metadata.redundantTargets.join(', ')}`
      });
    }

    if (bottleneck && bottleneck.intensity > 0.5) {
      findings.push({
        findingType: 'WORKFLOW_BOTTLENECK',
        severity: 'HIGH',
        title: 'Task Bottleneck Encountered',
        description: 'The user spent an unusually long duration processing specific steps, indicating form confusion or system delays.',
        evidence: `Average step duration: ${bottleneck.metadata.avgStepDuration.toFixed(1)} seconds.`
      });
    }

    if (steps && steps.intensity > 0.5) {
      findings.push({
        findingType: 'COMPLEX_FLOW',
        severity: 'LOW',
        title: 'Excessive Path Length',
        description: 'The workflow requires a high number of manual clicks and navigation steps, indicating opportunities to consolidate screens.',
        evidence: `Completed ${steps.metadata.stepCount} interactions to resolve the task.`
      });
    }

    return findings;
  }
}
export default WorkflowFindings;
