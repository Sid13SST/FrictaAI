import { PrismaClient } from '@fricta/db';
import { AgentMessage } from '../types';
import { RealtimeEventBus } from '@fricta/realtime';

export class MessageBroker {
  constructor(
    private prisma: PrismaClient,
    private orchestrationSessionId: string
  ) {}

  /**
   * Dispatches and logs a structured message exchange between two agents or an agent and the core.
   */
  async sendMessage(message: Omit<AgentMessage, 'timestamp'>) {
    const timestamp = new Date();
    console.log(`[MessageBroker] [${timestamp.toISOString()}] ${message.fromAgent} -> ${message.toAgent} [${message.messageType}]`);
    
    const result = await this.prisma.delegationEvent.create({
      data: {
        orchestrationSessionId: this.orchestrationSessionId,
        fromAgent: message.fromAgent,
        toAgent: message.toAgent,
        eventType: message.messageType,
        payload: message.payload ?? {},
        timestamp
      }
    });

    try {
      RealtimeEventBus.getInstance().publish({
        timestamp: timestamp.toISOString(),
        orchestrationSessionId: this.orchestrationSessionId,
        eventType: 'delegation.triggered',
        payload: {
          fromAgent: message.fromAgent,
          toAgent: message.toAgent,
          eventType: message.messageType,
          payload: message.payload ?? {}
        }
      });
    } catch (err) {
      console.error('[MessageBroker] Failed to publish delegation.triggered event:', err);
    }

    return result;
  }

  /**
   * Retrieves all logged messages chronologically.
   */
  async getMessages() {
    return await this.prisma.delegationEvent.findMany({
      where: { orchestrationSessionId: this.orchestrationSessionId },
      orderBy: { timestamp: 'asc' }
    });
  }
}
