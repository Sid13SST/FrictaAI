import { RealtimeEvent } from '../types';

export class AgentTelemetryCompiler {
  /**
   * Constructs an agent.progress event object
   */
  public static compileProgress(
    orchestrationSessionId: string,
    taskId: string,
    agentType: string,
    description: string,
    step?: string
  ): RealtimeEvent {
    return {
      timestamp: new Date().toISOString(),
      orchestrationSessionId,
      eventType: 'agent.progress',
      payload: {
        taskId,
        agentType,
        description,
        step
      }
    };
  }

  /**
   * Constructs an agent.failed event object
   */
  public static compileFailure(
    orchestrationSessionId: string,
    taskId: string,
    agentType: string,
    error: string,
    retryCount?: number
  ): RealtimeEvent {
    return {
      timestamp: new Date().toISOString(),
      orchestrationSessionId,
      eventType: 'agent.failed',
      payload: {
        taskId,
        agentType,
        error,
        retryCount
      }
    };
  }
}
