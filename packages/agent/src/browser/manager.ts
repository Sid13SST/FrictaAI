import { chromium, Browser, BrowserContext } from 'playwright';

export class BrowserManager {
  private browser: Browser | null = null;
  private contexts: Map<string, BrowserContext> = new Map();

  async launch(headless: boolean = true): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
  }

  async createContext(sessionId: string): Promise<BrowserContext> {
    if (!this.browser) {
      throw new Error('Browser is not launched. Call launch() first.');
    }

    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });

    this.contexts.set(sessionId, context);
    return context;
  }

  async getContext(sessionId: string): Promise<BrowserContext | undefined> {
    return this.contexts.get(sessionId);
  }

  async closeContext(sessionId: string): Promise<void> {
    const context = this.contexts.get(sessionId);
    if (context) {
      await context.close();
      this.contexts.delete(sessionId);
    }
  }

  async closeAll(): Promise<void> {
    for (const [id, context] of this.contexts) {
      await context.close();
    }
    this.contexts.clear();
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
