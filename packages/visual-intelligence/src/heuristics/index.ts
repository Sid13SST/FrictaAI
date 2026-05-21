import { LayoutAnalyzer } from '../layout';
import { VisualObservation } from '../types';

export class VisualHeuristicsEngine {
  analyze(analyzer: LayoutAnalyzer, screenshotId: string): VisualObservation[] {
    const observations: VisualObservation[] = [];

    this.checkCTADiscoverability(analyzer, screenshotId, observations);
    this.checkVisualHierarchy(analyzer, screenshotId, observations);
    this.checkClutter(analyzer, screenshotId, observations);
    this.checkEmptyState(analyzer, screenshotId, observations);
    this.checkFormClarity(analyzer, screenshotId, observations);
    this.checkNavigationComplexity(analyzer, screenshotId, observations);

    return observations;
  }

  private checkCTADiscoverability(
    analyzer: LayoutAnalyzer,
    screenshotId: string,
    obs: VisualObservation[]
  ): void {
    const primaryCTAs = analyzer.getPrimaryCTAs();
    const allButtons = analyzer.getElementsByRole('button');

    if (primaryCTAs.length === 0) {
      // No primary CTA found
      const ctaRegions = allButtons.map(b => ({
        x: b.box.x,
        y: b.box.y,
        w: b.box.w,
        h: b.box.h,
        label: 'Competing Action'
      }));

      obs.push({
        screenshotId,
        findingType: 'weak_cta',
        severity: 'high',
        title: 'Weak CTA Prominence',
        description: 'The page lacks a clear, prominent primary call-to-action button, causing cognitive overhead for users trying to determine the next step.',
        boundingBoxes: ctaRegions.slice(0, 3),
        metadata: { buttonsCount: allButtons.length }
      });
    } else {
      // Analyze the primary CTAs
      primaryCTAs.forEach(cta => {
        const isSmall = cta.box.w < 80 || cta.box.h < 30;
        if (isSmall) {
          obs.push({
            screenshotId,
            findingType: 'weak_cta',
            severity: 'medium',
            title: 'Sub-optimal CTA Size',
            description: `The primary CTA "${cta.text}" is too small (width: ${cta.box.w}px, height: ${cta.box.h}px), making it hard to target and visually discover.`,
            boundingBoxes: [{ ...cta.box, label: 'Small CTA' }],
            metadata: { width: cta.box.w, height: cta.box.h }
          });
        }

        // Check if placed in secondary navigation sidebar or footer
        const isSidebar = cta.box.x < 250;
        if (isSidebar) {
          obs.push({
            screenshotId,
            findingType: 'weak_cta',
            severity: 'medium',
            title: 'Misplaced Primary CTA',
            description: `The primary CTA "${cta.text}" is placed inside the secondary navigation/sidebar area, which is less prominent than the central content pane.`,
            boundingBoxes: [{ ...cta.box, label: 'Misplaced CTA' }],
            metadata: { x: cta.box.x }
          });
        }
      });

      // Check competing secondary buttons
      if (allButtons.length > 5) {
        obs.push({
          screenshotId,
          findingType: 'weak_cta',
          severity: 'low',
          title: 'Excessive Secondary Buttons',
          description: `There are ${allButtons.length} total buttons on this page. Having too many secondary options dilutes the discoverability of the main CTA.`,
          boundingBoxes: allButtons.slice(0, 5).map(b => ({ ...b.box, label: 'Competing Button' })),
          metadata: { totalButtons: allButtons.length }
        });
      }
    }
  }

  private checkVisualHierarchy(
    analyzer: LayoutAnalyzer,
    screenshotId: string,
    obs: VisualObservation[]
  ): void {
    const headings = analyzer.getElementsByRole('heading');
    if (headings.length > 0) {
      // Check sizing hierarchy: generally h1 should be larger than h2, etc.
      // But since we can't extract precise font-size deterministically in this layer,
      // we check for logical positioning or density.
      const firstHeading = headings[0];
      const isNestedLow = firstHeading.box.y > 400; // Heading far down the page
      if (isNestedLow) {
        obs.push({
          screenshotId,
          findingType: 'poor_hierarchy',
          severity: 'medium',
          title: 'Deep Heading Placement',
          description: 'The main heading is located far down the viewport, disrupting standard top-to-bottom reading scan flows.',
          boundingBoxes: [{ ...firstHeading.box, label: 'Delayed Heading' }],
          metadata: { y: firstHeading.box.y }
        });
      }
    }
  }

  private checkClutter(
    analyzer: LayoutAnalyzer,
    screenshotId: string,
    obs: VisualObservation[]
  ): void {
    const allElements = analyzer.getElements();
    const overlaps = analyzer.checkOverlaps();

    if (allElements.length > 40) {
      obs.push({
        screenshotId,
        findingType: 'clutter',
        severity: 'high',
        title: 'Excessive Interface Density',
        description: `This page contains ${allElements.length} interactive and semantic elements. High visual density increases cognitive load and hampers user efficiency.`,
        boundingBoxes: allElements.slice(0, 5).map(el => ({ ...el.box, label: 'Clutter Source' })),
        metadata: { totalElementsCount: allElements.length }
      });
    }

    if (overlaps.length > 0) {
      const overlapBoxes = overlaps.slice(0, 3).flatMap(ov => [
        { ...ov.el1.box, label: 'Overlapping Item' },
        { ...ov.el2.box, label: 'Overlapping Item' }
      ]);
      obs.push({
        screenshotId,
        findingType: 'clutter',
        severity: 'medium',
        title: 'Overlapping Bounding Areas',
        description: 'Detected overlapping layout boxes, which can cause target misclicks and visual interface collisions.',
        boundingBoxes: overlapBoxes,
        metadata: { overlapsCount: overlaps.length }
      });
    }
  }

  private checkEmptyState(
    analyzer: LayoutAnalyzer,
    screenshotId: string,
    obs: VisualObservation[]
  ): void {
    const allElements = analyzer.getElements();
    const texts = allElements.filter(el => el.role === 'text' || el.role === 'heading');
    
    const hasEmptyKeyword = texts.some(t => {
      const txt = t.text.toLowerCase();
      return (
        txt.includes('no ') ||
        txt.includes('empty') ||
        txt.includes('get started') ||
        txt.includes('create your first') ||
        txt.includes('welcome')
      );
    });

    if (hasEmptyKeyword && allElements.length < 5) {
      const primaryCTAs = analyzer.getPrimaryCTAs();
      if (primaryCTAs.length === 0) {
        obs.push({
          screenshotId,
          findingType: 'empty_state',
          severity: 'high',
          title: 'Friction in Empty State Guidance',
          description: 'The interface is in an empty state but lacks a clear primary onboarding CTA button. This makes it difficult for new users to find where to begin.',
          boundingBoxes: texts.slice(0, 2).map(t => ({ ...t.box, label: 'Empty State Prompt' })),
          metadata: { elementCount: allElements.length }
        });
      }
    }
  }

  private checkFormClarity(
    analyzer: LayoutAnalyzer,
    screenshotId: string,
    obs: VisualObservation[]
  ): void {
    const inputs = analyzer.getElementsByRole('input');
    const formRegions = analyzer.getRegions().filter(r => r.type === 'form');

    if (formRegions.length > 0) {
      formRegions.forEach(form => {
        const formInputs = inputs.filter(inp => {
          const ib = inp.box;
          const fb = form.box;
          return ib.x >= fb.x && ib.x <= fb.x + fb.w && ib.y >= fb.y && ib.y <= fb.y + fb.h;
        });

        if (formInputs.length > 8) {
          obs.push({
            screenshotId,
            findingType: 'form_density',
            severity: 'medium',
            title: 'High Input Form Density',
            description: `Form has ${formInputs.length} input fields. Overloaded forms without visual grouping or step division lead to user fatigue and increased dropout rates.`,
            boundingBoxes: [{ ...form.box, label: 'Dense Form' }],
            metadata: { fieldsCount: formInputs.length }
          });
        }
      });
    } else if (inputs.length > 10) {
      obs.push({
        screenshotId,
        findingType: 'form_density',
        severity: 'low',
        title: 'Excessive Input Fields',
        description: `Found ${inputs.length} total input fields not grouped within semantic form elements. Grouping fields helps users chunk information.`,
        boundingBoxes: inputs.slice(0, 5).map(i => ({ ...i.box, label: 'Ungrouped Input' })),
        metadata: { inputsCount: inputs.length }
      });
    }
  }

  private checkNavigationComplexity(
    analyzer: LayoutAnalyzer,
    screenshotId: string,
    obs: VisualObservation[]
  ): void {
    const sidebarElements = analyzer.getElementsInRegion('sidebar');
    const navLinks = sidebarElements.filter(el => el.role === 'link');

    if (navLinks.length > 10) {
      obs.push({
        screenshotId,
        findingType: 'nav_overload',
        severity: 'medium',
        title: 'Navigation Sidebar Overload',
        description: `The sidebar contains ${navLinks.length} navigation links. Complex and crowded sidebar navigation makes searching items difficult.`,
        boundingBoxes: navLinks.slice(0, 5).map(l => ({ ...l.box, label: 'Sidebar Link' })),
        metadata: { sidebarLinksCount: navLinks.length }
      });
    }
  }
}
