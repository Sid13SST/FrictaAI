import { CorrelatedTimelineEvent, UnifiedUXReportPayload } from './types';

export class TimelineCompiler {
  /**
   * Correlates actions, thoughts, visual findings, and cognitive signals into a sorted chronological stream.
   */
  static compile(
    actions: any[],
    thoughts: any[],
    uxFindings: any[],
    cognitiveSignals: any[],
    visualFindings: any[]
  ): CorrelatedTimelineEvent[] {
    const events: CorrelatedTimelineEvent[] = [];

    // 1. Process Actions
    actions.forEach(action => {
      const isError = action.errorMessage || action.status === 'failed';
      events.push({
        id: action.id || `action-${action.stepNumber}-${action.timestamp}`,
        stepIndex: action.stepNumber || 0,
        timestamp: new Date(action.timestamp),
        eventType: isError ? 'ERROR' : 'ACTION',
        title: isError 
          ? `Interaction Failure: ${action.action}` 
          : `${action.action.toUpperCase()} Target: ${action.target}`,
        description: action.errorMessage || `Executed action on target element ${action.target} with value: "${action.value || ''}".`,
        metadata: {
          target: action.target,
          value: action.value,
          status: action.status,
          errorMessage: action.errorMessage
        }
      });
    });

    // 2. Process Thoughts
    thoughts.forEach(thought => {
      events.push({
        id: thought.id || `thought-${thought.stepNumber}-${thought.timestamp}`,
        stepIndex: thought.stepNumber || 0,
        timestamp: new Date(thought.timestamp),
        eventType: 'THOUGHT',
        title: 'Cognitive Rationale',
        description: thought.thought,
      });
    });

    // 3. Process Visual Findings
    visualFindings.forEach(vf => {
      // Determine step number, fallback to metadata or 0
      let stepIndex = 0;
      if (vf.metadata && typeof vf.metadata === 'object' && vf.metadata.stepIndex !== undefined) {
        stepIndex = Number(vf.metadata.stepIndex);
      } else if (vf.description) {
        const match = vf.description.match(/step (\d+)/i);
        if (match) stepIndex = parseInt(match[1], 10);
      }

      events.push({
        id: vf.id || `visual-${stepIndex}-${vf.timestamp}`,
        stepIndex,
        timestamp: new Date(vf.timestamp || new Date()),
        eventType: 'VISUAL_FINDING',
        title: `Visual Defect: ${vf.title}`,
        description: vf.description,
        metadata: {
          findingType: vf.findingType,
          severity: vf.severity,
          boundingBoxes: vf.boundingBoxes,
          screenshotId: vf.screenshotId
        }
      });
    });

    // 4. Process Cognitive Signals
    cognitiveSignals.forEach(cs => {
      let stepIndex = 0;
      if (cs.metadata && typeof cs.metadata === 'object' && cs.metadata.stepIndex !== undefined) {
        stepIndex = Number(cs.metadata.stepIndex);
      }

      // We only flag spikes if intensity is > 0.4
      if (cs.intensity > 0.4) {
        events.push({
          id: cs.id || `cog-${stepIndex}-${cs.timestamp}`,
          stepIndex,
          timestamp: new Date(cs.timestamp || new Date()),
          eventType: 'COGNITIVE_SPIKE',
          title: `Cognitive Signal: ${cs.signalType}`,
          description: `Detected high-intensity UX signal: ${cs.signalType} (Intensity: ${(cs.intensity * 100).toFixed(0)}%)`,
          metadata: {
            signalType: cs.signalType,
            intensity: cs.intensity,
            meta: cs.metadata
          }
        });
      }
    });

    // Sort: Step index ascending, then timestamp ascending, then eventType priority (ACTION -> THOUGHT -> VISUAL_FINDING -> COGNITIVE_SPIKE -> ERROR)
    const typePriority: Record<string, number> = {
      'ACTION': 1,
      'THOUGHT': 2,
      'VISUAL_FINDING': 3,
      'COGNITIVE_SPIKE': 4,
      'ERROR': 5
    };

    return events.sort((a, b) => {
      if (a.stepIndex !== b.stepIndex) {
        return a.stepIndex - b.stepIndex;
      }
      const timeDiff = a.timestamp.getTime() - b.timestamp.getTime();
      if (timeDiff !== 0) return timeDiff;
      
      const priorityA = typePriority[a.eventType] || 99;
      const priorityB = typePriority[b.eventType] || 99;
      return priorityA - priorityB;
    });
  }
}
