import { Page } from 'playwright-core';
import * as path from 'path';
import * as fs from 'fs/promises';

export class ScreenshotService {
  private baseStoragePath: string;

  constructor(baseStoragePath?: string) {
    // Default to project root / storage
    this.baseStoragePath = baseStoragePath || path.join(process.cwd(), 'storage', 'sessions');
  }

  private async ensureDirectory(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Ignore if exists
    }
  }

  async captureFullPage(page: Page, sessionId: string, namePrefix: string = 'full'): Promise<string> {
    const sessionDir = path.join(this.baseStoragePath, sessionId);
    await this.ensureDirectory(sessionDir);

    const timestamp = Date.now();
    const filename = `${namePrefix}-${timestamp}.png`;
    const filePath = path.join(sessionDir, filename);

    await page.screenshot({ path: filePath, fullPage: true });
    return filePath;
  }

  async captureViewport(page: Page, sessionId: string, namePrefix: string = 'viewport'): Promise<string> {
    const sessionDir = path.join(this.baseStoragePath, sessionId);
    await this.ensureDirectory(sessionDir);

    const timestamp = Date.now();
    const filename = `${namePrefix}-${timestamp}.png`;
    const filePath = path.join(sessionDir, filename);

    await page.screenshot({ path: filePath, fullPage: false });
    return filePath;
  }

  async captureElement(page: Page, sessionId: string, selector: string, namePrefix: string = 'element'): Promise<string | null> {
    const element = await page.$(selector);
    if (!element) return null;

    const sessionDir = path.join(this.baseStoragePath, sessionId);
    await this.ensureDirectory(sessionDir);

    const timestamp = Date.now();
    const filename = `${namePrefix}-${timestamp}.png`;
    const filePath = path.join(sessionDir, filename);

    await element.screenshot({ path: filePath });
    return filePath;
  }
}
