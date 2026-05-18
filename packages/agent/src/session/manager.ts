import { BrowserContext, Page } from 'playwright-core';
import { 
  MCPContextBuilder, 
  InteractionTracker, 
  MemoryEngine, 
  ScreenshotService 
} from '@fricta/mcp';
import { MCPContext } from '@fricta/types';

export interface SessionCallbacks {
  onInteraction?: (event: { type: string; target: string; url: string; timestamp: number; metadata?: any }) => void | Promise<void>;
  onScreenshot?: (screenshot: { filePath: string; label: string; timestamp: Date }) => void | Promise<void>;
}

export class SessionManager {
  private page: Page | null = null;
  private tracker: InteractionTracker;
  private memory: MemoryEngine;
  private builder: MCPContextBuilder;
  private screenshot: ScreenshotService;

  constructor(
    private readonly sessionId: string,
    private readonly context: BrowserContext,
    private readonly callbacks?: SessionCallbacks
  ) {
    this.tracker = new InteractionTracker();
    this.memory = new MemoryEngine();
    this.builder = new MCPContextBuilder();
    this.screenshot = new ScreenshotService();
  }

  async start(initialUrl: string): Promise<void> {
    this.page = await this.context.newPage();
    await this.navigate(initialUrl);
  }

  async navigate(url: string): Promise<void> {
    if (!this.page) throw new Error('Session not started');
    
    await this.page.goto(url, { waitUntil: 'networkidle' });
    this.memory.recordVisit(this.page.url());
    
    const event = {
      type: 'navigate' as const,
      target: url,
      url: this.page.url(),
      timestamp: Date.now(),
    };
    this.tracker.record(event);
    if (this.callbacks?.onInteraction) {
      await Promise.resolve(this.callbacks.onInteraction(event));
    }
    
    const screenshotPath = await this.screenshot.captureFullPage(this.page, this.sessionId, 'nav');
    if (this.callbacks?.onScreenshot) {
      await Promise.resolve(this.callbacks.onScreenshot({
        filePath: screenshotPath,
        label: 'nav',
        timestamp: new Date(),
      }));
    }
  }

  async click(selector: string): Promise<void> {
    if (!this.page) throw new Error('Session not started');
    
    await this.page.click(selector);
    
    const event = {
      type: 'click' as const,
      target: selector,
      url: this.page.url(),
      timestamp: Date.now(),
    };
    this.tracker.record(event);
    if (this.callbacks?.onInteraction) {
      await Promise.resolve(this.callbacks.onInteraction(event));
    }
    
    await this.page.waitForLoadState('networkidle');
    this.memory.recordVisit(this.page.url());
    
    const screenshotPath = await this.screenshot.captureViewport(this.page, this.sessionId, 'click');
    if (this.callbacks?.onScreenshot) {
      await Promise.resolve(this.callbacks.onScreenshot({
        filePath: screenshotPath,
        label: 'click',
        timestamp: new Date(),
      }));
    }
  }

  async type(selector: string, text: string): Promise<void> {
    if (!this.page) throw new Error('Session not started');
    
    await this.page.fill(selector, text);
    
    const event = {
      type: 'type' as const,
      target: selector,
      url: this.page.url(),
      timestamp: Date.now(),
      metadata: { textLength: text.length },
    };
    this.tracker.record(event);
    if (this.callbacks?.onInteraction) {
      await Promise.resolve(this.callbacks.onInteraction(event));
    }
    
    const screenshotPath = await this.screenshot.captureViewport(this.page, this.sessionId, 'type');
    if (this.callbacks?.onScreenshot) {
      await Promise.resolve(this.callbacks.onScreenshot({
        filePath: screenshotPath,
        label: 'type',
        timestamp: new Date(),
      }));
    }
  }

  async getContext(): Promise<MCPContext> {
    if (!this.page) throw new Error('Session not started');
    return this.builder.build(this.sessionId, this.page, this.tracker, this.memory);
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
  }
}
