import { chromium, Browser, BrowserContext } from 'playwright';

export class BrowserManager {
  private browser: Browser | null = null;
  private contexts: Map<string, BrowserContext> = new Map();

  async launch(headless: boolean = true): Promise<void> {
    if (!this.browser) {
      // Optional: use a preinstalled Chromium instead of Playwright's managed
      // download (e.g. CI images or sandboxes that block the browser CDN).
      const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim() || undefined;
      this.browser = await chromium.launch({
        headless,
        executablePath,
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

    // When the backend runs under tsx (npm run dev), esbuild's keepNames wraps
    // named functions in `__name(fn, "name")`. Functions handed to
    // page.evaluate() are serialised into the page, where that helper does not
    // exist, so every evaluate with a named inner function threw
    // "ReferenceError: __name is not defined" (e.g. screenshot metadata).
    // A no-op shim in each document makes those calls harmless. Passed as a
    // string so the shim itself is never transformed.
    await context.addInitScript({
      content: 'if (typeof globalThis.__name !== "function") { globalThis.__name = function (fn) { return fn; }; }',
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
