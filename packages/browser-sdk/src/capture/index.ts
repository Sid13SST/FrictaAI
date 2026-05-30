import { PrivacyProtector } from '../privacy';

export interface CapturedEvent {
  eventType: string;
  payload: any;
  timestamp: string;
}

export class InteractionCapture {
  private privacy: PrivacyProtector;
  private onCaptureCallback: (event: CapturedEvent) => void;
  private clickHistory: { target: string; time: number }[] = [];
  private lastUrl = '';

  constructor(privacy: PrivacyProtector, onCapture: (event: CapturedEvent) => void) {
    this.privacy = privacy;
    this.onCaptureCallback = onCapture;
    if (typeof window !== 'undefined') {
      this.lastUrl = window.location.href;
    }
  }

  /**
   * Initializes all DOM listeners.
   */
  start(): void {
    if (typeof window === 'undefined') return;

    this.bindClickCapture();
    this.bindNavigationCapture();
    this.bindScrollCapture();
    this.bindViewportCapture();
  }

  /**
   * Generates a unique CSS-like selector path for a DOM element.
   */
  private getSelectorPath(el: HTMLElement): string {
    const path: string[] = [];
    let current: HTMLElement | null = el;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.nodeName.toLowerCase();
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break; // Unique enough
      } else {
        let sibling = current;
        let nth = 1;
        while (sibling.previousElementSibling) {
          sibling = sibling.previousElementSibling as HTMLElement;
          if (sibling.nodeName.toLowerCase() === selector.split(':')[0]) {
            nth++;
          }
        }
        if (nth > 1) {
          selector += `:nth-of-type(${nth})`;
        }
      }
      path.unshift(selector);
      current = current.parentElement;
    }
    return path.join(' > ');
  }

  /**
   * Captures click interactions and checks for Rage Click signals.
   */
  private bindClickCapture(): void {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const selector = this.getSelectorPath(target);
      const text = this.privacy.sanitizeText(target.innerText || target.getAttribute('value') || '', target);
      
      const now = Date.now();
      this.clickHistory.push({ target: selector, time: now });
      this.clickHistory = this.clickHistory.filter(c => now - c.time < 1000); // 1s window

      // Check for Rage Click (5 clicks in 1 second on the same element)
      const matches = this.clickHistory.filter(c => c.target === selector);
      if (matches.length >= 5) {
        this.onCaptureCallback({
          eventType: 'FrictionSignal',
          payload: {
            frictionType: 'RAGE_CLICK',
            score: 0.9,
            details: {
              target: selector,
              clickCount: matches.length,
              elementText: text,
            }
          },
          timestamp: new Date().toISOString(),
        });
        // Clear window so we don't trigger multiple alarms
        this.clickHistory = [];
      }

      this.onCaptureCallback({
        eventType: 'InteractionEvent',
        payload: {
          action: 'CLICK',
          target: selector,
          elementType: target.tagName,
          text: text,
        },
        timestamp: new Date().toISOString(),
      });
    }, true);
  }

  /**
   * Monkey patches pushState and replaceState to detect SPA router path changes.
   */
  private bindNavigationCapture(): void {
    const handleUrlChange = () => {
      const currentUrl = window.location.href;
      if (currentUrl !== this.lastUrl) {
        this.onCaptureCallback({
          eventType: 'NavigationEvent',
          payload: {
            fromUrl: this.lastUrl,
            toUrl: currentUrl,
            durationMs: 0, // Calculated downstream
          },
          timestamp: new Date().toISOString(),
        });
        this.lastUrl = currentUrl;
      }
    };

    // Popstate (forward/back browser actions)
    window.addEventListener('popstate', handleUrlChange);

    // Patch pushState
    const originalPush = window.history.pushState;
    window.history.pushState = function (state: any, title: string, url?: string | null) {
      const result = originalPush.apply(this, [state, title, url]);
      handleUrlChange();
      return result;
    };

    // Patch replaceState
    const originalReplace = window.history.replaceState;
    window.history.replaceState = function (state: any, title: string, url?: string | null) {
      const result = originalReplace.apply(this, [state, title, url]);
      handleUrlChange();
      return result;
    };
  }

  /**
   * Tracks maximum scroll depth percentage, debouncing high-frequency events.
   */
  private bindScrollCapture(): void {
    let lastPercentage = 0;
    let timeout: any = null;

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;

      const percentage = Math.round((scrollTop / scrollHeight) * 100);

      // Report only if scrolled past a new 20% milestone
      if (percentage > lastPercentage && percentage % 20 === 0) {
        lastPercentage = percentage;
        this.onCaptureCallback({
          eventType: 'InteractionEvent',
          payload: {
            action: 'SCROLL',
            target: 'window',
            elementType: 'viewport',
            scrollDepthPercentage: percentage,
          },
          timestamp: new Date().toISOString(),
        });
      }
    };

    window.addEventListener('scroll', () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(handleScroll, 100);
    });
  }

  /**
   * Observes viewport width and height resizes.
   */
  private bindViewportCapture(): void {
    let timeout: any = null;

    const handleResize = () => {
      this.onCaptureCallback({
        eventType: 'InteractionEvent',
        payload: {
          action: 'RESIZE',
          target: 'window',
          elementType: 'viewport',
          width: window.innerWidth,
          height: window.innerHeight,
        },
        timestamp: new Date().toISOString(),
      });
    };

    window.addEventListener('resize', () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(handleResize, 250);
    });
  }
}
