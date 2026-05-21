import { EmittedSignal } from '../../shared';
import { VisualHeuristics } from '../heuristics';

export class VisualSignals {
  static compute(sessionData: any): EmittedSignal[] {
    const signals: EmittedSignal[] = [];
    const screenshots = sessionData.screenshots || [];

    // 1. Visual Clutter
    const clutterRes = VisualHeuristics.detectVisualClutter(screenshots);
    if (clutterRes.hasClutter) {
      signals.push({
        signalType: 'VISUAL_CLUTTER',
        intensity: Math.min(1.0, 0.5 + (clutterRes.maxElements - 50) * 0.01),
        metadata: { maxElementsCount: clutterRes.maxElements }
      });
    }

    // 2. Element Overlap
    const overlapRes = VisualHeuristics.detectOverlaps(screenshots);
    if (overlapRes.overlapCount > 0) {
      signals.push({
        signalType: 'ELEMENT_OVERLAP',
        intensity: Math.min(1.0, 0.4 + overlapRes.overlapCount * 0.15),
        metadata: { overlapCount: overlapRes.overlapCount, overlappingPairs: overlapRes.overlappingPairs }
      });
    }

    // 3. Weak Visual Hierarchy & Contrast
    const hierarchyRes = VisualHeuristics.detectWeakHierarchy(screenshots);
    if (hierarchyRes.missingH1) {
      signals.push({
        signalType: 'WEAK_VISUAL_HIERARCHY',
        intensity: 0.7,
        metadata: { reason: 'No clear H1 main heading element' }
      });
    }

    if (hierarchyRes.lowTextContrastRatio) {
      signals.push({
        signalType: 'CONTRAST_VIOLATION',
        intensity: 0.8,
        metadata: { details: 'Text elements with contrast ratio < 4.5:1' }
      });
    }

    // 4. Misalignment
    const misalignCount = VisualHeuristics.detectAlignmentIssues(screenshots);
    if (misalignCount > 2) {
      signals.push({
        signalType: 'MISALIGNMENT_FRICTION',
        intensity: Math.min(1.0, 0.3 + misalignCount * 0.1),
        metadata: { alignmentJitterCount: misalignCount }
      });
    }

    return signals;
  }
}
export default VisualSignals;
