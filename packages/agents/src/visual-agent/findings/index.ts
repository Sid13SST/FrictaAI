import { StructuredFinding, EmittedSignal } from '../../shared';

export class VisualFindings {
  static compile(signals: EmittedSignal[]): StructuredFinding[] {
    const findings: StructuredFinding[] = [];

    const clutter = signals.find(s => s.signalType === 'VISUAL_CLUTTER');
    const overlap = signals.find(s => s.signalType === 'ELEMENT_OVERLAP');
    const hierarchy = signals.find(s => s.signalType === 'WEAK_VISUAL_HIERARCHY');
    const contrast = signals.find(s => s.signalType === 'CONTRAST_VIOLATION');
    const misalignment = signals.find(s => s.signalType === 'MISALIGNMENT_FRICTION');

    if (clutter && clutter.intensity > 0.5) {
      findings.push({
        findingType: 'VISUAL_CLUTTER',
        severity: 'MEDIUM',
        title: 'Excessive Visual Clutter',
        description: 'The layout has an extremely high count of visual and interactive elements crowded together, causing visual noise.',
        evidence: `Max of ${clutter.metadata.maxElementsCount} layout elements found on a single viewport.`
      });
    }

    if (overlap && overlap.intensity > 0.5) {
      findings.push({
        findingType: 'ELEMENT_OVERLAP',
        severity: 'HIGH',
        title: 'Overlapping Layout Elements',
        description: 'Interactive and text elements overlap on screen, causing visual bugs and potentially preventing user interaction.',
        evidence: `Detected ${overlap.metadata.overlapCount} overlaps. Example: ${overlap.metadata.overlappingPairs.join('; ')}`
      });
    }

    if (hierarchy && hierarchy.intensity > 0.5) {
      findings.push({
        findingType: 'WEAK_VISUAL_HIERARCHY',
        severity: 'LOW',
        title: 'Weak Heading Hierarchy',
        description: 'The page lacks a clear heading structure or is missing a top-level H1 container to structure layout zones.',
        evidence: 'No primary H1 element identified on active viewport layout.'
      });
    }

    if (contrast && contrast.intensity > 0.5) {
      findings.push({
        findingType: 'CONTRAST_VIOLATION',
        severity: 'MEDIUM',
        title: 'Low Contrast Readability Warning',
        description: 'Some text elements have insufficient contrast against their background colors, violating accessibility guidelines.',
        evidence: 'Text elements with contrast ratio < 4.5:1 detected.'
      });
    }

    if (misalignment && misalignment.intensity > 0.4) {
      findings.push({
        findingType: 'ALIGNMENT_BUG',
        severity: 'LOW',
        title: 'Visual Field Misalignment',
        description: 'Buttons and inputs have minor pixel alignment variations, causing a disorganized grid presentation.',
        evidence: `Detected ${misalignment.metadata.alignmentJitterCount} alignment offsets (1-3px delta) across neighboring inputs/buttons.`
      });
    }

    return findings;
  }
}
export default VisualFindings;
