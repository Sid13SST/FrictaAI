import { EventEmitter } from 'events';
import { RealtimeEvent } from '../types';

export class RealtimeEventBus {
  private static instance: RealtimeEventBus;
  private emitter: EventEmitter;

  private constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100);
  }

  public static getInstance(): RealtimeEventBus {
    if (!RealtimeEventBus.instance) {
      RealtimeEventBus.instance = new RealtimeEventBus();
    }
    return RealtimeEventBus.instance;
  }

  /**
   * Publish a realtime event to listeners of that session and global observers.
   */
  public publish<T = any>(event: RealtimeEvent<T>): void {
    const formattedEvent: RealtimeEvent<T> = {
      id: event.id || Math.random().toString(36).substring(7),
      timestamp: event.timestamp || new Date().toISOString(),
      orchestrationSessionId: event.orchestrationSessionId,
      eventType: event.eventType,
      payload: event.payload
    };

    console.log(`[RealtimeEventBus] Event Published: ${formattedEvent.eventType} for session ${formattedEvent.orchestrationSessionId}`);
    
    this.emitter.emit(`session:${formattedEvent.orchestrationSessionId}`, formattedEvent);
    this.emitter.emit('all', formattedEvent);
  }

  /**
   * Subscribe to events for a specific orchestration session.
   * Returns an unsubscribe function.
   */
  public subscribe(
    orchestrationSessionId: string,
    callback: (event: RealtimeEvent) => void
  ): () => void {
    const eventName = `session:${orchestrationSessionId}`;
    this.emitter.on(eventName, callback);
    return () => {
      this.emitter.off(eventName, callback);
    };
  }

  /**
   * Subscribe to all events passing through the bus.
   * Returns an unsubscribe function.
   */
  public subscribeAll(callback: (event: RealtimeEvent) => void): () => void {
    this.emitter.on('all', callback);
    return () => {
      this.emitter.off('all', callback);
    };
  }
}
