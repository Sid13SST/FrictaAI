import { Page } from 'playwright-core';
import { PrismaClient } from '@fricta/db';
import { VisualStorageManager } from '../storage';
import { compressAndResizeScreenshot } from '../compression';
import { generateScreenshotMetadata } from '../metadata';
import { VisualTimelineManager } from '../timeline';
import { CaptureOptions } from '../types';

export class VisualCaptureEngine {
  private storage: VisualStorageManager;
  private timeline: VisualTimelineManager;

  constructor(private prisma: PrismaClient, storageBaseDir?: string) {
    this.storage = new VisualStorageManager(storageBaseDir);
    this.timeline = new VisualTimelineManager(prisma);
  }

  /**
   * Captures a screenshot, compresses it, generates a thumbnail, extracts metadata,
   * saves files to disk, and records details in the database.
   */
  async capture(
    page: Page,
    sessionId: string,
    options: CaptureOptions
  ): Promise<any> {
    try {
      if (page.isClosed()) {
        throw new Error('Page is closed');
      }

      // 1. Capture raw screenshot as PNG from Playwright
      const isFullPage = options.screenshotType === 'full';
      const rawBuffer = await page.screenshot({ fullPage: isFullPage, type: 'png' });

      // 2. Perform zero-dependency browser-based WebP compression and thumbnail generation
      // Re-check page isn't closed — compression uses page.evaluate which will throw
      if (page.isClosed()) {
        return null;
      }
      const compressionQuality = options.quality ?? 0.8;
      const targetWidth = options.targetWidth ?? 1280;
      const thumbnailWidth = options.thumbnailWidth ?? 320;

      const { webpBuffer, thumbnailBuffer, width, height } = await compressAndResizeScreenshot(
        page,
        rawBuffer,
        { quality: compressionQuality, targetWidth, thumbnailWidth }
      );

      // 3. Generate DOM & Browser Metadata
      const metadata = await generateScreenshotMetadata(page);

      // 4. Save WebP files to storage
      const timestamp = Date.now();
      const baseFilename = `step-${options.stepIndex}-${options.screenshotType}-${timestamp}`;
      const webpFilename = `${baseFilename}.webp`;
      const thumbFilename = `${baseFilename}-thumb.webp`;

      const relativeWebpPath = await this.storage.saveFile(sessionId, webpFilename, webpBuffer);
      const relativeThumbPath = await this.storage.saveFile(sessionId, thumbFilename, thumbnailBuffer);

      // 5. Store record in the database
      const fileSize = webpBuffer.length;
      
      const screenshotRecord = await this.prisma.workflowScreenshot.create({
        data: {
          workflowSessionId: sessionId,
          screenshotType: options.screenshotType,
          filePath: relativeWebpPath,
          thumbnailPath: relativeThumbPath,
          stepIndex: options.stepIndex,
          pageUrl: options.pageUrl || page.url(),
          viewportWidth: metadata.viewportWidth || options.viewportWidth,
          viewportHeight: metadata.viewportHeight || options.viewportHeight,
          actionContext: options.actionContext || null,
          fileSize,
          metadata: metadata as any,
        },
      });

      return screenshotRecord;
    } catch (error: any) {
      // Silently discard expected page-closed errors; log everything else
      const isClosedError =
        error.message?.includes('closed') ||
        error.message?.includes('Target page') ||
        error.message?.includes('context or browser');
      if (!isClosedError) {
        console.error('[VisualCaptureEngine] Capture failed:', error.message);
      }
      // Retain operational robustness - do not crash the workflow agent if visual capture fails
      return null;
    }
  }

  /**
   * Helper to create a timeline event linking a screenshot to an action or thought
   */
  async linkToTimeline(payload: {
    workflowSessionId: string;
    screenshotId: string;
    actionId?: string;
    thoughtId?: string;
    eventType: 'action' | 'thought' | 'signal' | 'error';
    timestamp?: Date;
  }) {
    try {
      return await this.timeline.createTimelineEvent(payload);
    } catch (error: any) {
      console.error('[VisualCaptureEngine] Link to timeline failed:', error.message);
      return null;
    }
  }
  
  getStorage() {
    return this.storage;
  }

  getTimelineManager() {
    return this.timeline;
  }
}
