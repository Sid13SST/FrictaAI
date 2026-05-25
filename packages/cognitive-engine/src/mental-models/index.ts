export interface UIConvention {
  elementRole: string;
  expectedSelectorPattern: string;
  recommendation: string;
}

export const STANDARD_UI_CONVENTIONS: UIConvention[] = [
  {
    elementRole: 'Settings Option',
    expectedSelectorPattern: 'nav, header, sidebar',
    recommendation: 'Place settings directly in header/sidebar navigation instead of collapsing inside profile dropdowns.',
  },
  {
    elementRole: 'Primary Submit CTA',
    expectedSelectorPattern: 'button[type="submit"], button.primary',
    recommendation: 'Ensure submit triggers are colored with high-contrast background branding.',
  },
  {
    elementRole: 'Assistance/Help Link',
    expectedSelectorPattern: 'footer, header .help',
    recommendation: 'Help links should be docked to footer or header right, avoiding cluttered layout sidebars.',
  },
];

export class MentalModelEngine {
  public static verifyConvention(selector: string, role: string): boolean {
    const convention = STANDARD_UI_CONVENTIONS.find(c => c.elementRole === role);
    if (!convention) return true;
    
    const patterns = convention.expectedSelectorPattern.split(',').map(p => p.trim());
    return patterns.some(pattern => selector.includes(pattern));
  }
}
