export class DiscoverabilityHeuristics {
  static detectCompetingHierarchy(screenshots: any[]): { competing: boolean; count: number } {
    // Check if a single viewport has multiple primary buttons or CTA links placed close to each other
    for (const s of screenshots) {
      const layout = s.metadata?.layout;
      if (layout) {
        const primaryButtons = (layout.elements || []).filter((e: any) => 
          e.role === 'button' && 
          (e.intent === 'primary' || (e.text || '').toLowerCase().includes('create') || (e.text || '').toLowerCase().includes('start'))
        );

        if (primaryButtons.length >= 2) {
          return { competing: true, count: primaryButtons.length };
        }
      }
    }
    return { competing: false, count: 0 };
  }

  static detectWeakCTA(screenshots: any[]): { weak: boolean; details: string } {
    // Look for button elements that are too small (width < 80px or height < 30px)
    for (const s of screenshots) {
      const layout = s.metadata?.layout;
      if (layout) {
        for (const el of layout.elements || []) {
          if (el.role === 'button' && el.box) {
            const w = el.box.w || el.box.width || 0;
            const h = el.box.h || el.box.height || 0;
            if (w > 0 && h > 0 && (w < 80 || h < 32)) {
              return { weak: true, details: `Button "${el.text || ''}" has small bounding box: ${w}x${h}px` };
            }
          }
        }
      }
    }
    return { weak: false, details: '' };
  }

  static detectAffordanceAmbiguity(interactions: any[]): boolean {
    // User clicks static text, spans, or non-interactive headings in interaction logs
    const clickInteractions = interactions.filter(i => i.type === 'click' || i.type === 'mousedown');
    for (const inter of clickInteractions) {
      const target = (inter.target || '').toLowerCase();
      if (target.startsWith('div') || target.startsWith('span') || target.startsWith('h1') || target.startsWith('h2') || target.startsWith('h3')) {
        // Exclude divs/spans that represent known buttons or links
        if (!target.includes('button') && !target.includes('btn') && !target.includes('link') && !target.includes('a')) {
          return true;
        }
      }
    }
    return false;
  }
}
