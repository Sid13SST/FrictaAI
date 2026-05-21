export class VisualHeuristics {
  static detectVisualClutter(screenshots: any[]): { maxElements: number; hasClutter: boolean } {
    let maxElements = 0;
    for (const s of screenshots) {
      const layout = s.metadata?.layout;
      if (layout && layout.elements) {
        const count = layout.elements.length;
        if (count > maxElements) {
          maxElements = count;
        }
      }
    }
    // High density (clutter) threshold is e.g. 50 elements on screen
    return {
      maxElements,
      hasClutter: maxElements > 50
    };
  }

  static detectOverlaps(screenshots: any[]): { overlapCount: number; overlappingPairs: string[] } {
    let overlapCount = 0;
    const overlappingPairs: string[] = [];

    for (const s of screenshots) {
      const layout = s.metadata?.layout;
      if (layout && layout.elements && layout.elements.length > 1) {
        const elements = layout.elements;
        for (let i = 0; i < elements.length; i++) {
          for (let j = i + 1; j < elements.length; j++) {
            const e1 = elements[i];
            const e2 = elements[j];

            if (e1.box && e2.box) {
              const b1 = e1.box;
              const b2 = e2.box;

              // Check intersection of bounding boxes
              const xOverlap = Math.max(0, Math.min(b1.x + b1.w, b2.x + b2.w) - Math.max(b1.x, b2.x));
              const yOverlap = Math.max(0, Math.min(b1.y + b1.h, b2.y + b2.h) - Math.max(b1.y, b2.y));

              // If substantial overlap (more than 10px area) and not parent-child containment
              if (xOverlap > 5 && yOverlap > 5) {
                // Ignore if one box is completely inside the other (containment)
                const isContained = (b1.x >= b2.x && b1.y >= b2.y && (b1.x + b1.w) <= (b2.x + b2.w) && (b1.y + b1.h) <= (b2.y + b2.h)) ||
                                    (b2.x >= b1.x && b2.y >= b1.y && (b2.x + b2.w) <= (b1.x + b1.w) && (b2.y + b2.h) <= (b1.y + b1.h));
                
                if (!isContained) {
                  overlapCount++;
                  overlappingPairs.push(`${e1.role || 'element'} (${e1.text || ''}) overlaps ${e2.role || 'element'} (${e2.text || ''})`);
                }
              }
            }
          }
        }
      }
    }

    return { overlapCount, overlappingPairs: Array.from(new Set(overlappingPairs)).slice(0, 5) };
  }

  static detectWeakHierarchy(screenshots: any[]): { missingH1: boolean; lowTextContrastRatio: boolean } {
    let missingH1 = true;
    let lowTextContrastRatio = false;

    for (const s of screenshots) {
      const layout = s.metadata?.layout;
      if (layout && layout.elements) {
        const hasH1 = layout.elements.some((e: any) => e.role === 'heading' && (e.level === 1 || e.textLevel === 1 || (e.text || '').toLowerCase().includes('h1')));
        if (hasH1) {
          missingH1 = false;
        }

        // If there's style contrast details
        const lowContrast = layout.elements.some((e: any) => e.metadata?.contrastRatio && e.metadata.contrastRatio < 4.5);
        if (lowContrast) {
          lowTextContrastRatio = true;
        }
      }
    }

    return {
      missingH1,
      lowTextContrastRatio
    };
  }

  static detectAlignmentIssues(screenshots: any[]): number {
    let alignmentIssues = 0;
    // We check if elements that have similar X coordinates (but off by 1-4 pixels) exist, suggesting misalignment
    for (const s of screenshots) {
      const layout = s.metadata?.layout;
      if (layout && layout.elements) {
        const elements = layout.elements.filter((e: any) => e.role === 'input' || e.role === 'button');
        for (let i = 0; i < elements.length; i++) {
          for (let j = i + 1; j < elements.length; j++) {
            const x1 = elements[i].box?.x;
            const x2 = elements[j].box?.x;
            if (x1 !== undefined && x2 !== undefined) {
              const diff = Math.abs(x1 - x2);
              if (diff > 0 && diff <= 3) {
                alignmentIssues++;
              }
            }
          }
        }
      }
    }
    return alignmentIssues;
  }
}
export default VisualHeuristics;
