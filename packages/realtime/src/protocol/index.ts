import { RealtimeEvent } from '../types';

export class RealtimeProtocolFormatter {
  /**
   * Formats a RealtimeEvent or message to Server-Sent Events (SSE) format string.
   */
  public static formatSSE(event: string, data: any, id?: string): string {
    let output = '';
    if (id) {
      output += `id: ${id}\n`;
    }
    output += `event: ${event}\n`;
    output += `data: ${JSON.stringify(data)}\n\n`;
    return output;
  }

  /**
   * Formats a raw RealtimeEvent directly.
   */
  public static serializeEvent(event: RealtimeEvent): string {
    return this.formatSSE(event.eventType, event.payload, event.id);
  }
}
