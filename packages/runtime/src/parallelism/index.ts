import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { logger } from '@fricta/shared';

export interface ContextLease {
  context: BrowserContext;
  sessionId: string;
  startedAt: Date;
  lastUsedAt: Date;
}

export class BrowserPoolManager {
  private browser: Browser | null = null;
  private activeContexts: Map<string, ContextLease> = new Map();
  private maxContexts: number;
  private leaseTimeoutMs: number = 600000; // 10 minutes timeout
  private checkInterval: NodeJS.Timeout | null = null;
  private totalLaunchedCount: number = 0;
  private recycledCount: number = 0;
  private leaseDurations: number[] = [];

  constructor(maxContexts?: number) {
    this.maxContexts = maxContexts || parseInt(process.env.MAX_CONCURRENT_BROWSERS || '5', 10);
    this.startTimeoutSupervision();
  }

  private async ensureBrowser(): Promise<Browser> {
    if (this.browser) {
      try {
        // Ping browser to check if connected and alive
        await this.browser.newContext().then(c => c.close());
      } catch (err) {
        logger.warn({ err }, 'Browser instance is unhealthy or crashed. Relaunching...');
        await this.closeAll();
      }
    }

    if (!this.browser) {
      logger.info('Launching new Chromium browser instance for pool');
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--js-flags="--max-old-space-size=512"' // Limit memory per tab
        ],
      });
      this.totalLaunchedCount++;
    }

    return this.browser;
  }

  /**
   * Acquire an isolated BrowserContext for a session.
   */
  async acquireContext(sessionId: string): Promise<BrowserContext> {
    if (this.activeContexts.size >= this.maxContexts) {
      logger.warn(
        { activeCount: this.activeContexts.size, maxContexts: this.maxContexts },
        'Browser Pool capacity warning! Maximum concurrent contexts reached.'
      );
      throw new Error(`Browser Pool capacity exceeded: maximum of ${this.maxContexts} concurrent contexts allowed.`);
    }

    const browser = await this.ensureBrowser();

    logger.info({ sessionId }, 'Creating isolated browser context');
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });

    // Add page error listener to catch crashes
    context.on('page', (page) => {
      page.on('crash', () => {
        logger.error({ sessionId }, 'Playwright page crashed!');
      });
    });

    this.activeContexts.set(sessionId, {
      context,
      sessionId,
      startedAt: new Date(),
      lastUsedAt: new Date(),
    });

    return context;
  }

  /**
   * Recycle and release a browser context.
   */
  async releaseContext(sessionId: string): Promise<void> {
    const lease = this.activeContexts.get(sessionId);
    if (!lease) return;

    logger.info({ sessionId }, 'Releasing and recycling browser context');
    try {
      // Clear cookies and local storage (recycle step)
      await lease.context.clearCookies();
      
      // Close context to clean up memory
      await lease.context.close();
      this.recycledCount++;
      
      const leaseDuration = Date.now() - lease.startedAt.getTime();
      this.leaseDurations.push(leaseDuration);
      if (this.leaseDurations.length > 50) this.leaseDurations.shift(); // Keep moving window
    } catch (err: any) {
      logger.error({ err: err.message, sessionId }, 'Error closing browser context during release');
    } finally {
      this.activeContexts.delete(sessionId);
    }
  }

  /**
   * Capture a screenshot in an isolated viewport context.
   */
  async captureIsolatedScreenshot(page: Page, outputPath: string): Promise<void> {
    try {
      await page.screenshot({
        path: outputPath,
        type: 'jpeg',
        quality: 80,
      });
    } catch (err: any) {
      logger.error({ err: err.message, outputPath }, 'Isolated screenshot capture failed');
      throw err;
    }
  }

  /**
   * Monitor context lease times and reclaim timed-out contexts.
   */
  private startTimeoutSupervision() {
    this.checkInterval = setInterval(async () => {
      const now = Date.now();
      for (const [sessionId, lease] of this.activeContexts.entries()) {
        const elapsed = now - lease.startedAt.getTime();
        if (elapsed > this.leaseTimeoutMs) {
          logger.warn(
            { sessionId, elapsedSeconds: elapsed / 1000 },
            'Lease timeout exceeded for browser context. Force reclaiming...'
          );
          await this.releaseContext(sessionId);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Fetch current pool usage metrics.
   */
  getStatus() {
    const totalLeases = this.leaseDurations.length;
    const avgLeaseMs = totalLeases > 0 
      ? this.leaseDurations.reduce((a, b) => a + b, 0) / totalLeases 
      : 0;

    return {
      activeContexts: this.activeContexts.size,
      idleContexts: Math.max(0, this.maxContexts - this.activeContexts.size),
      totalLaunched: this.totalLaunchedCount,
      recycledCount: this.recycledCount,
      contextLeaseAvgMs: Math.round(avgLeaseMs)
    };
  }

  async closeAll(): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    for (const [sessionId, lease] of this.activeContexts) {
      try {
        await lease.context.close();
      } catch {}
    }
    this.activeContexts.clear();

    if (this.browser) {
      try {
        await this.browser.close();
      } catch {}
      this.browser = null;
    }
  }
}
