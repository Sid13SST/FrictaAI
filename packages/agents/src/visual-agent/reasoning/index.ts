import { ReasoningStep, EmittedSignal } from '../../shared';

export class VisualReasoning {
  static evaluate(signals: EmittedSignal[]): ReasoningStep[] {
    const traces: ReasoningStep[] = [];

    traces.push({
      stepType: 'SCREEN_LAYOUT_AUDIT',
      summary: 'Audited visual layout files, coordinate structures, and bounding boxes for alignment, contrast, hierarchy, and overlapping elements.',
      evidence: `Processed ${signals.length} visual-level signals.`
    });

    const clutter = signals.find(s => s.signalType === 'VISUAL_CLUTTER');
    const overlap = signals.find(s => s.signalType === 'ELEMENT_OVERLAP');
    const hierarchy = signals.find(s => s.signalType === 'WEAK_VISUAL_HIERARCHY');
    const contrast = signals.find(s => s.signalType === 'CONTRAST_VIOLATION');
    const misalignment = signals.find(s => s.signalType === 'MISALIGNMENT_FRICTION');

    if (clutter) {
      traces.push({
        stepType: 'EVIDENCE_CORRELATION',
        summary: `Identified visual clutter with a maximum of ${clutter.metadata.maxElementsCount} interactive elements on a single page view.`,
        evidence: 'Having more than 50 elements overwhelms standard visual parsing capabilities and leads to task dispersion.'
      });
    }

    if (overlap) {
      traces.push({
        stepType: 'EVIDENCE_CORRELATION',
        summary: `Detected ${overlap.metadata.overlapCount} layout element overlaps.`,
        evidence: `Direct intersection of bounding boxes (e.g. ${overlap.metadata.overlappingPairs.join(', ')}) creates layout bugs and prevents clicking.`
      });
    }

    if (hierarchy) {
      traces.push({
        stepType: 'EVIDENCE_CORRELATION',
        summary: 'Detected a lack of clear visual hierarchy: missing H1 main header element.',
        evidence: 'Without a clear heading structure, screen readers and users cannot quickly anchor their spatial comprehension.'
      });
    }

    if (contrast) {
      traces.push({
        stepType: 'EVIDENCE_CORRELATION',
        summary: 'Detected text contrast violations: some text elements fall below WCAG 2.1 AA 4.5:1 ratio.',
        evidence: 'Text element colors do not sufficiently stand out from their background surfaces, causing readability obstacles.'
      });
    }

    if (misalignment) {
      traces.push({
        stepType: 'EVIDENCE_CORRELATION',
        summary: `Identified ${misalignment.metadata.alignmentJitterCount} misaligned fields or buttons.`,
        evidence: 'Interactive components have small offset differences (1-3px), suggesting rendering or flex layout bugs.'
      });
    }

    return traces;
  }
}
export default VisualReasoning;
