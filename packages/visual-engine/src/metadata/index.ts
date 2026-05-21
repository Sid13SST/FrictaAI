import { Page } from 'playwright-core';

export async function generateScreenshotMetadata(page: Page): Promise<{
  userAgent: string;
  pageTitle: string;
  language: string;
  url: string;
  interactiveElementsCount: number;
  devicePixelRatio: number;
  viewportWidth: number;
  viewportHeight: number;
  screen: {
    width: number;
    height: number;
  };
  timestamp: string;
  layout?: {
    regions: Array<{ type: string; box: { x: number; y: number; w: number; h: number } }>;
    elements: Array<{
      id?: string;
      name?: string;
      role: string;
      text: string;
      intent: string;
      box: { x: number; y: number; w: number; h: number };
    }>;
  };
}> {
  try {
    return await page.evaluate(() => {
      const doc = document;
      
      const getBox = (el: Element) => {
        const rect = el.getBoundingClientRect();
        return {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          w: Math.round(rect.width),
          h: Math.round(rect.height)
        };
      };

      // 1. Identify layout regions
      const regions: any[] = [];
      const regionTags = ['header', 'footer', 'main', 'nav', 'aside', 'form'];
      regionTags.forEach(tag => {
        doc.querySelectorAll(tag).forEach(el => {
          const box = getBox(el);
          if (box.w > 0 && box.h > 0) {
            regions.push({
              type: tag === 'aside' ? 'sidebar' : tag,
              box
            });
          }
        });
      });

      // Sidebar fallbacks
      const sidebars = doc.querySelectorAll('.sidebar, #sidebar, [id*="sidebar"], [class*="sidebar"]');
      sidebars.forEach(el => {
        const box = getBox(el);
        if (box.w > 0 && box.h > 0 && !regions.some(r => r.type === 'sidebar' && r.box.x === box.x && r.box.y === box.y)) {
          regions.push({ type: 'sidebar', box });
        }
      });

      // 2. Extract key elements
      const elements: any[] = [];
      const selectors = [
        { sel: 'button, [role="button"]', role: 'button' },
        { sel: 'input, textarea, select', role: 'input' },
        { sel: 'a, [role="link"]', role: 'link' },
        { sel: 'h1, h2, h3, h4, h5, h6', role: 'heading' }
      ];

      selectors.forEach(({ sel, role }) => {
        doc.querySelectorAll(sel).forEach(el => {
          const box = getBox(el);
          if (box.w > 0 && box.h > 0) {
            const htmlNode = el as HTMLElement;
            const text = (htmlNode.textContent || '').trim().substring(0, 100);
            
            let intent = 'neutral';
            const textLower = text.toLowerCase();
            const classLower = (htmlNode.className || '').toString().toLowerCase();
            const type = htmlNode.getAttribute('type') || '';

            const isDestructive = 
              textLower.includes('delete') || 
              textLower.includes('remove') || 
              textLower.includes('discard') || 
              classLower.includes('destructive') || 
              classLower.includes('danger') || 
              classLower.includes('delete') || 
              classLower.includes('red-');
              
            const isPrimary = 
              type === 'submit' || 
              textLower.includes('submit') || 
              textLower.includes('save') || 
              textLower.includes('confirm') || 
              textLower.includes('continue') || 
              textLower.includes('agree') || 
              classLower.includes('primary') || 
              classLower.includes('cta') || 
              classLower.includes('blue-');

            const isSecondary = 
              textLower.includes('cancel') || 
              textLower.includes('secondary') || 
              textLower.includes('back') || 
              textLower.includes('previous') || 
              classLower.includes('secondary') || 
              classLower.includes('cancel');

            if (isDestructive) intent = 'destructive';
            else if (isPrimary) intent = 'primary';
            else if (isSecondary) intent = 'secondary';

            elements.push({
              id: htmlNode.id || undefined,
              name: htmlNode.getAttribute('name') || undefined,
              role,
              text,
              intent,
              box
            });
          }
        });
      });

      const interactiveElements = doc.querySelectorAll(
        'button, a, input, select, textarea, [role="button"], [onclick]'
      );

      return {
        userAgent: navigator.userAgent,
        pageTitle: doc.title || '',
        language: navigator.language || '',
        url: window.location.href,
        interactiveElementsCount: interactiveElements.length,
        devicePixelRatio: window.devicePixelRatio || 1,
        viewportWidth: window.innerWidth || 0,
        viewportHeight: window.innerHeight || 0,
        screen: {
          width: window.screen ? window.screen.width : 0,
          height: window.screen ? window.screen.height : 0,
        },
        timestamp: new Date().toISOString(),
        layout: {
          regions,
          elements
        }
      };
    });
  } catch (err: any) {
    console.warn('[VisualEngine] Metadata generation failed:', err.message);
    return {
      userAgent: 'unknown',
      pageTitle: '',
      language: '',
      url: page.url() || '',
      interactiveElementsCount: 0,
      devicePixelRatio: 1,
      viewportWidth: 1280,
      viewportHeight: 720,
      screen: {
        width: 1280,
        height: 720,
      },
      timestamp: new Date().toISOString(),
      layout: {
        regions: [],
        elements: []
      }
    };
  }
}
