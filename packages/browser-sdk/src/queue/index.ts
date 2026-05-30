import { TelemetryPayloadEvent } from '../types';

export class TelemetryQueue {
  private queue: TelemetryPayloadEvent[] = [];
  private endpoint: string;
  private apiKey: string;
  private batchIntervalMs: number;
  private maxBatchSize: number;
  private timer: any = null;
  private isProcessing = false;

  constructor(endpoint: string, apiKey: string, batchIntervalMs = 5000, maxBatchSize = 50) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.batchIntervalMs = batchIntervalMs;
    this.maxBatchSize = maxBatchSize;

    if (typeof window !== 'undefined') {
      this.startFlushTimer();
      // Listen to online events to trigger offline recovery
      window.addEventListener('online', () => this.recoverOfflineQueue());
    }
  }

  /**
   * Adds an event to the queue buffer. Flushes if size threshold is hit.
   */
  push(event: TelemetryPayloadEvent): void {
    this.queue.push(event);
    if (this.queue.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  /**
   * Periodically flushes queue.
   */
  private startFlushTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.flush();
    }, this.batchIntervalMs);
  }

  /**
   * Flushes current buffer. Compress payload (Base64) and dispatches to server.
   */
  async flush(): Promise<void> {
    if (this.queue.length === 0 || this.isProcessing) return;

    this.isProcessing = true;
    const batch = [...this.queue];
    this.queue = [];

    const success = await this.sendBatch(batch);
    if (!success) {
      // Save to offline storage
      this.saveToOfflineQueue(batch);
    }
    this.isProcessing = false;
  }

  /**
   * Base64 compression helper for telemetry payloads.
   */
  private compress(data: any): string {
    try {
      const json = JSON.stringify(data);
      if (typeof window !== 'undefined' && typeof btoa === 'function') {
        return btoa(unescape(encodeURIComponent(json)));
      }
      return Buffer.from(json).toString('base64');
    } catch {
      return JSON.stringify(data);
    }
  }

  /**
   * Transports batch. Uses fetch.
   */
  private async sendBatch(batch: TelemetryPayloadEvent[]): Promise<boolean> {
    const compressedPayload = this.compress(batch);

    try {
      if (typeof window !== 'undefined' && !navigator.onLine) {
        return false; // Offline
      }

      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'x-fricta-telemetry-encoding': 'base64'
        },
        body: JSON.stringify({
          projectId: batch[0]?.payload?.projectId || '',
          sessionKey: batch[0]?.payload?.sessionKey || '',
          data: compressedPayload
        })
      });

      return res.ok;
    } catch (err) {
      console.error('[TelemetryQueue] Ingestion network error:', err);
      return false;
    }
  }

  /**
   * Offline LocalStorage persistence.
   */
  private saveToOfflineQueue(batch: TelemetryPayloadEvent[]): void {
    try {
      const existing = localStorage.getItem('fricta_offline_telemetry');
      const offlineQueue: TelemetryPayloadEvent[] = existing ? JSON.parse(existing) : [];
      offlineQueue.push(...batch);
      // Cap size to 1000 items to avoid LocalStorage quota limit
      if (offlineQueue.length > 1000) {
        offlineQueue.splice(0, offlineQueue.length - 1000);
      }
      localStorage.setItem('fricta_offline_telemetry', JSON.stringify(offlineQueue));
      console.log(`[TelemetryQueue] Saved ${batch.length} events to offline queue storage.`);
    } catch (err) {
      console.error('[TelemetryQueue] Failed saving to offline storage:', err);
    }
  }

  /**
   * Recovers and retransmits cached events from LocalStorage.
   */
  private async recoverOfflineQueue(): Promise<void> {
    try {
      const existing = localStorage.getItem('fricta_offline_telemetry');
      if (!existing) return;

      const offlineQueue: TelemetryPayloadEvent[] = JSON.parse(existing);
      if (offlineQueue.length === 0) return;

      console.log(`[TelemetryQueue] Re-establishing online state. Retransmitting ${offlineQueue.length} cached events...`);

      // Flush in chunks of maxBatchSize
      while (offlineQueue.length > 0) {
        const chunk = offlineQueue.splice(0, this.maxBatchSize);
        const success = await this.sendBatch(chunk);
        if (!success) {
          // Re-queue remaining and stop
          offlineQueue.unshift(...chunk);
          localStorage.setItem('fricta_offline_telemetry', JSON.stringify(offlineQueue));
          return;
        }
      }

      localStorage.removeItem('fricta_offline_telemetry');
      console.log('[TelemetryQueue] Offline queue cache successfully cleared.');
    } catch (err) {
      console.error('[TelemetryQueue] Recovery execution failed:', err);
    }
  }
}
