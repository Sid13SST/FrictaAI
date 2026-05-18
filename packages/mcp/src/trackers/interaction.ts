import { MCPInteractionEvent } from '@fricta/types';

export class InteractionTracker {
  private events: MCPInteractionEvent[] = [];

  record(event: Omit<MCPInteractionEvent, 'timestamp'>): void {
    const interaction: MCPInteractionEvent = {
      ...event,
      timestamp: Date.now(),
    };
    this.events.push(interaction);
  }

  getHistory(): MCPInteractionEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}
