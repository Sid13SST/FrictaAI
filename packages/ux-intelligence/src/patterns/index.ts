export interface UXPattern {
  id: string;
  category: 'EMPTY_STATES' | 'PROGRESSIVE_DISCLOSURE' | 'CTA_HIERARCHY' | 'ONBOARDING' | 'COGNITIVE_LOAD' | 'NAVIGATION_CLARITY';
  name: string;
  description: string;
  guidelines: string[];
}

export const UX_PATTERN_LIBRARY: UXPattern[] = [
  {
    id: 'empty-states-guide',
    category: 'EMPTY_STATES',
    name: 'Actionable Empty States',
    description: 'Ensure empty pages suggest a direct next step instead of displaying a blank canvas.',
    guidelines: [
      'Show an illustrative, non-intimidating placeholder graphic.',
      'Explain why the page is currently empty in clear, friendly copy.',
      'Inject a primary, highly-visible button directly underneath the text to trigger the creation workflow.'
    ]
  },
  {
    id: 'progressive-disclosure-wizard',
    category: 'PROGRESSIVE_DISCLOSURE',
    name: 'Multi-Step Form Progressive Disclosure',
    description: 'Deconstruct long or intimidating forms containing more than 6 fields to prevent cognitive overload.',
    guidelines: [
      'Group related input fields logically into named step blocks.',
      'Render a visual progress bar indicating step completeness (e.g. Step 2 of 4).',
      'Show secondary back buttons to allow risk-free revision.'
    ]
  },
  {
    id: 'cta-hierarchy-rule',
    category: 'CTA_HIERARCHY',
    name: 'Distinct Visual CTA Hierarchy',
    description: 'Establish a dominant primary action button to eliminate cognitive choice fatigue.',
    guidelines: [
      'Ensure exactly one primary button is present per layout block using the high-contrast accent theme.',
      'Style auxiliary actions as secondary outlined or text links.',
      'Place primary actions in standard reading hot zones (e.g. bottom-right or top-right).'
    ]
  },
  {
    id: 'guided-onboarding-tips',
    category: 'ONBOARDING',
    name: 'Contextual Guided Onboarding',
    description: 'Introduce progressive, step-by-step guidance overlays for first-time workflows.',
    guidelines: [
      'Inject popover tooltips pointing directly to newly introduced action items.',
      'Provide a quick workspace tour that users can skip at any time.',
      'Keep text snippets short and focused on immediate user benefits.'
    ]
  },
  {
    id: 'cognitive-load-reduction',
    category: 'COGNITIVE_LOAD',
    name: 'Choice and Elements Reduction',
    description: 'Decrease element noise in main dashboard areas to maximize clarity.',
    guidelines: [
      'Limit the active menu navigation sidebar links to a maximum of 6 core pages.',
      'Hide advanced configurations under toggle or collapse components.',
      'Use white space generously (at least 30% spacing) to separate content zones.'
    ]
  },
  {
    id: 'navigation-clarity-links',
    category: 'NAVIGATION_CLARITY',
    name: 'Mental-Model Route Labeling',
    description: 'Label system pages with common terms matching average user expectations.',
    guidelines: [
      'Avoid brand-specific names (e.g. "Orbit Console") when common labels work better (e.g. "Dashboard").',
      'Keep route paths short and shallow.',
      'Render a breadcrumb indicator on deeply nested resource pages.'
    ]
  }
];

export class UXPatternEngine {
  static getPattern(id: string): UXPattern | undefined {
    return UX_PATTERN_LIBRARY.find(p => p.id === id);
  }

  static getPatternByCategory(category: string): UXPattern[] {
    return UX_PATTERN_LIBRARY.filter(p => p.category === category);
  }
}
