import { ActionData, InteractionData } from '@fricta/ux-intelligence/src/types';

export class NavigationHeuristics {
  static detectLoops(actions: any[], loopThreshold = 2): { loopFound: boolean; path: string[] } {
    const urls = actions
      .filter(a => a.action === 'navigate' || a.action === 'click_link')
      .map(a => a.value || a.target);

    if (urls.length < 4) return { loopFound: false, path: [] };

    // Simple loop detection: detect A -> B -> A -> B patterns
    for (let i = 0; i < urls.length - 3; i++) {
      const a1 = urls[i];
      const b1 = urls[i + 1];
      const a2 = urls[i + 2];
      const b2 = urls[i + 3];

      if (a1 === a2 && b1 === b2 && a1 !== b1) {
        return { loopFound: true, path: [a1, b1, a2, b2] };
      }
    }

    return { loopFound: false, path: [] };
  }

  static detectRouteSwitchFriction(actions: any[]): number {
    // Count consecutive navigation actions without user interactions (like input or primary clicks)
    let maxConsecutiveNavs = 0;
    let currentConsecutive = 0;

    for (const action of actions) {
      if (action.action === 'navigate' || action.action === 'click_link') {
        currentConsecutive++;
        if (currentConsecutive > maxConsecutiveNavs) {
          maxConsecutiveNavs = currentConsecutive;
        }
      } else if (action.action === 'input' || (action.action === 'click' && !action.target.includes('link') && !action.target.includes('nav'))) {
        currentConsecutive = 0;
      }
    }

    return maxConsecutiveNavs;
  }

  static detectDeadEnds(actions: any[]): boolean {
    if (actions.length === 0) return false;
    const lastAction = actions[actions.length - 1];
    
    // If last action is an error or user closed the tab, or it is a navigate that failed
    return lastAction.status === 'FAILED' || lastAction.errorMessage !== null;
  }

  static getSidebarComplexity(screenshots: any[]): number {
    // Inspect layouts to see average number of sidebar links/options
    let maxLinks = 0;
    for (const s of screenshots) {
      const layout = s.metadata?.layout;
      if (layout) {
        const sidebar = layout.regions?.find((r: any) => r.type === 'sidebar');
        if (sidebar) {
          const linksInSidebar = layout.elements?.filter((e: any) => 
            e.role === 'link' && 
            e.box.x >= sidebar.box.x && 
            e.box.x <= sidebar.box.x + sidebar.box.w
          );
          if (linksInSidebar && linksInSidebar.length > maxLinks) {
            maxLinks = linksInSidebar.length;
          }
        }
      }
    }
    return maxLinks;
  }
}
