import { LayoutElement, LayoutRegion, BoundingBox } from '../types';

export class LayoutAnalyzer {
  constructor(
    private regions: LayoutRegion[],
    private elements: LayoutElement[],
    private viewportWidth: number = 1280,
    private viewportHeight: number = 720
  ) {}

  getRegions(): LayoutRegion[] {
    return this.regions;
  }

  getElements(): LayoutElement[] {
    return this.elements;
  }

  getElementsByRole(role: string): LayoutElement[] {
    return this.elements.filter(el => el.role === role);
  }

  getPrimaryCTAs(): LayoutElement[] {
    return this.elements.filter(
      el => el.role === 'button' && (el.intent === 'primary' || el.text.toLowerCase().includes('cta') || el.text.toLowerCase().includes('primary'))
    );
  }

  getElementsInRegion(regionType: string): LayoutElement[] {
    const region = this.regions.find(r => r.type === regionType);
    if (!region) {
      // Fallback: estimate region mathematically if it doesn't exist semantically
      return this.elements.filter(el => {
        const { x, y } = el.box;
        if (regionType === 'header') return y < 100;
        if (regionType === 'footer') return y > this.viewportHeight - 100;
        if (regionType === 'sidebar') return x < 250 && y >= 100 && y <= this.viewportHeight - 100;
        if (regionType === 'main') return x >= 250 && y >= 100 && y <= this.viewportHeight - 100;
        return false;
      });
    }

    const { x, y, w, h } = region.box;
    return this.elements.filter(el => {
      const eBox = el.box;
      return (
        eBox.x >= x &&
        eBox.x <= x + w &&
        eBox.y >= y &&
        eBox.y <= y + h
      );
    });
  }

  checkOverlaps(): Array<{ el1: LayoutElement; el2: LayoutElement }> {
    const overlaps: Array<{ el1: LayoutElement; el2: LayoutElement }> = [];
    for (let i = 0; i < this.elements.length; i++) {
      for (let j = i + 1; j < this.elements.length; j++) {
        const el1 = this.elements[i];
        const el2 = this.elements[j];
        if (this.isOverlapping(el1.box, el2.box)) {
          overlaps.push({ el1, el2 });
        }
      }
    }
    return overlaps;
  }

  private isOverlapping(b1: BoundingBox, b2: BoundingBox): boolean {
    return (
      b1.x < b2.x + b2.w &&
      b1.x + b1.w > b2.x &&
      b1.y < b2.y + b2.h &&
      b1.y + b1.h > b2.y
    );
  }
}
