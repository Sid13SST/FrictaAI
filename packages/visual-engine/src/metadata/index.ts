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
}> {
  try {
    return await page.evaluate(() => {
      const doc = document;
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
    };
  }
}
