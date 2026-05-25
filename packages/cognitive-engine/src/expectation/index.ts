import { PersonaTraits, VisualElement, ExpectationMismatchResult } from '../types';

export class ExpectationMismatchEstimator {
  public static calculate(
    traits: PersonaTraits,
    activeElement: VisualElement,
    url: string,
    stepIndex: number
  ): ExpectationMismatchResult | null {
    const selector = activeElement.selector.toLowerCase();
    const text = activeElement.text.toLowerCase();
    const path = url.toLowerCase();

    // 1. Navigation Placement mismatch: E.g., Settings hidden in avatar dropdown instead of navigation
    if (selector.includes('avatar') || selector.includes('dropdown') || text.includes('profile')) {
      if (text.includes('settings') || selector.includes('settings')) {
        return {
          expectedAction: 'Settings option directly visible in Top Navigation header',
          actualAction: 'Settings option hidden inside collapsible Avatar Dropdown',
          mismatchSeverity: 'MEDIUM',
          mismatchCategory: 'NAV_MISPLACEMENT',
          description: 'User expected settings to be visible on the main page/nav header. Misplacement in avatar menu increased discovery time.',
        };
      }
    }

    // 2. CTA Ambiguity mismatch: Expected clear submit buttons, got low contrast or non-standard trigger
    if (activeElement.type === 'BUTTON' && activeElement.contrastStrength < 0.6) {
      return {
        expectedAction: 'Prominent, high-contrast primary Action CTA',
        actualAction: `Low contrast action button (${activeElement.selector})`,
        mismatchSeverity: 'MEDIUM',
        mismatchCategory: 'CTA_AMBIGUITY',
        description: 'Visual conventions dictate CTAs should draw attention. Weak contrast mismatch caused initial user scanning uncertainty.',
      };
    }

    // 3. UI Convention Break: Expects text elements or card containers to be static, but user clicked it expecting it to link/navigate
    if (activeElement.type === 'TEXT_BLOCK' && activeElement.interactionDensity > 0.6) {
      return {
        expectedAction: 'Static visual information block container',
        actualAction: `Highly cluttered clickable container block (${activeElement.selector})`,
        mismatchSeverity: 'HIGH',
        mismatchCategory: 'UI_CONVENTION_BREAK',
        description: 'Highly dense visual clutter made user click static container thinking it was interactable. Major design convention desync.',
      };
    }

    // 4. Progress Desync: User trying to complete checkout but help link or ad banner is prioritized due to prominence
    if (path.includes('checkout') && activeElement.type === 'LINK' && activeElement.ctaProminence > 0.6) {
      return {
        expectedAction: 'Checkout workflow confirmation and input fields',
        actualAction: `High prominence distraction link (${activeElement.selector})`,
        mismatchSeverity: 'MEDIUM',
        mismatchCategory: 'PROGRESS_DESYNC',
        description: 'User expected focus to remain on form fields. Outsized visual prominence of distracting helper links caused workflow drift.',
      };
    }

    return null;
  }
}
