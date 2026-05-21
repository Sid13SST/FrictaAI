import { Page } from 'playwright-core';

export async function compressAndResizeScreenshot(
  page: Page,
  rawBuffer: Buffer,
  options: {
    quality?: number;
    targetWidth?: number;
    thumbnailWidth?: number;
  } = {}
): Promise<{
  webpBuffer: Buffer;
  thumbnailBuffer: Buffer;
  width: number;
  height: number;
}> {
  const quality = options.quality ?? 0.8;
  const targetWidth = options.targetWidth ?? 1280;
  const thumbnailWidth = options.thumbnailWidth ?? 320;

  const base64Png = rawBuffer.toString('base64');

  try {
    const result = await page.evaluate(
      async ({ base64, q, tw, thw }) => {
        return new Promise<{ webp: string; thumb: string; w: number; h: number }>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            try {
              const origW = img.naturalWidth || img.width;
              const origH = img.naturalHeight || img.height;

              // Calculate main resized size
              const mainW = tw;
              const mainH = Math.round((origH / origW) * tw);

              // Main Canvas
              const canvas = document.createElement('canvas');
              canvas.width = mainW;
              canvas.height = mainH;
              const ctx = canvas.getContext('2d');
              if (!ctx) throw new Error('No 2d context');
              ctx.drawImage(img, 0, 0, mainW, mainH);
              
              // We use toDataURL. Chrome supports WebP. Fallback to JPEG if needed.
              let webpData = canvas.toDataURL('image/webp', q);
              if (webpData.startsWith('data:image/png')) {
                // If WebP is not supported (rare in Chromium), fallback to JPEG
                webpData = canvas.toDataURL('image/jpeg', q);
              }

              // Thumbnail Canvas
              const thumbW = thw;
              const thumbH = Math.round((origH / origW) * thw);
              const thumbCanvas = document.createElement('canvas');
              thumbCanvas.width = thumbW;
              thumbCanvas.height = thumbH;
              const thumbCtx = thumbCanvas.getContext('2d');
              if (!thumbCtx) throw new Error('No 2d context for thumbnail');
              thumbCtx.drawImage(img, 0, 0, thumbW, thumbH);
              
              let thumbData = thumbCanvas.toDataURL('image/webp', q);
              if (thumbData.startsWith('data:image/png')) {
                thumbData = thumbCanvas.toDataURL('image/jpeg', q);
              }

              resolve({
                webp: webpData,
                thumb: thumbData,
                w: origW,
                h: origH
              });
            } catch (err: any) {
              reject(err.message || 'Compression error inside browser');
            }
          };
          img.onerror = () => reject('Failed to load image in browser context');
          img.src = 'data:image/png;base64,' + base64;
        });
      },
      { base64: base64Png, q: quality, tw: targetWidth, thw: thumbnailWidth }
    );

    const webpBuffer = Buffer.from(result.webp.split(',')[1], 'base64');
    const thumbnailBuffer = Buffer.from(result.thumb.split(',')[1], 'base64');

    return {
      webpBuffer,
      thumbnailBuffer,
      width: result.w,
      height: result.h
    };
  } catch (err: any) {
    console.warn('[VisualEngine] Browser-based compression failed, falling back to raw PNG:', err.message);
    // Fallback: return raw image as webpBuffer and thumbnailBuffer
    return {
      webpBuffer: rawBuffer,
      thumbnailBuffer: rawBuffer,
      width: 1280, // Approximate fallback width
      height: 720  // Approximate fallback height
    };
  }
}
