export type ScreenshotType = 'step' | 'error' | 'full' | 'viewport';

export interface CaptureOptions {
  screenshotType: ScreenshotType;
  stepIndex: number;
  pageUrl: string;
  viewportWidth: number;
  viewportHeight: number;
  actionContext?: string;
  quality?: number; // 0-1 compression quality
  targetWidth?: number; // Target width for standard resize
  thumbnailWidth?: number; // Target width for thumbnail
}

export interface CompressedOutput {
  filePath: string;
  thumbnailPath: string;
  fileSize: number;
  thumbnailSize: number;
  width: number;
  height: number;
}

export interface TimelineEventPayload {
  workflowSessionId: string;
  screenshotId: string;
  actionId?: string;
  thoughtId?: string;
  eventType: 'action' | 'thought' | 'signal' | 'error';
  timestamp?: Date;
}
