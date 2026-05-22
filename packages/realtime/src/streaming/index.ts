import { Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import { RealtimeEventBus } from '../events';
import { RealtimeEvent } from '../types';
import { PresenceTracker } from '../presence';

export interface SSEStreamOptions {
  c: Context;
  sessionId: string;
  streamName: string;
  filterFn: (event: RealtimeEvent) => boolean;
  hydrateFn?: (stream: any) => Promise<void>;
}

export async function createRealtimeStream(options: SSEStreamOptions) {
  const { c, sessionId, streamName, filterFn, hydrateFn } = options;

  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');
  c.header('X-Accel-Buffering', 'no'); // Disable proxy buffering

  return streamSSE(c, async (stream) => {
    const clientId = Math.random().toString(36).substring(7);
    const presence = PresenceTracker.getInstance();
    presence.joinSession(sessionId, clientId);
    let isAborted = false;

    // Send connection success payload
    await stream.writeSSE({
      event: 'system.connected',
      data: JSON.stringify({ status: 'connected', stream: streamName, clientId, timestamp: new Date().toISOString() })
    });

    // Stream past events for hydration if provided
    if (hydrateFn) {
      try {
        await hydrateFn(stream);
      } catch (err: any) {
        console.error(`[SSE Streaming] [${streamName}] Hydration failed for session ${sessionId}:`, err);
        await stream.writeSSE({
          event: 'system.error',
          data: JSON.stringify({ message: 'Hydration failed', error: err.message })
        });
      }
    }

    // Mark hydration complete so frontend knows past history has loaded
    await stream.writeSSE({
      event: 'system.hydrated',
      data: JSON.stringify({ timestamp: new Date().toISOString() })
    });

    const bus = RealtimeEventBus.getInstance();
    const unsubscribe = bus.subscribe(sessionId, async (event) => {
      if (isAborted) return;
      if (filterFn(event)) {
        try {
          await stream.writeSSE({
            event: event.eventType,
            id: event.id,
            data: JSON.stringify(event.payload)
          });
        } catch (writeErr) {
          // If we fail to write, client might have disconnected. Let onAbort or Ping handle cleanup.
        }
      }
    });

    // Setup ping heartbeats to maintain active connection
    const pingTimer = setInterval(async () => {
      if (isAborted) return;
      try {
        await stream.writeSSE({
          event: 'ping',
          data: JSON.stringify({ timestamp: Date.now() })
        });
      } catch (err) {
        isAborted = true;
        clearInterval(pingTimer);
        unsubscribe();
        presence.leaveSession(sessionId, clientId);
      }
    }, 15000);

    stream.onAbort(() => {
      isAborted = true;
      clearInterval(pingTimer);
      unsubscribe();
      presence.leaveSession(sessionId, clientId);
    });

    // Block stream scope so it remains active in Hono
    while (!isAborted) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  });
}
