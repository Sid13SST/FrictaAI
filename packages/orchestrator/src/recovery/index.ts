import { TimelineRecorder } from '../timeline';
import { OrchestrationTask } from '../types';

export class RecoveryManager {
  constructor(private timeline: TimelineRecorder) {}

  /**
   * Recovers from task execution timeouts.
   */
  async handleTimeout(task: OrchestrationTask): Promise<boolean> {
    await this.timeline.logEvent('RECOVERY_TRIGGERED', {
      taskId: task.id,
      agentType: task.agentType,
      description: `Agent ${task.agentType} task timed out. Initiating Timeout Recovery.`
    });
    return true;
  }

  /**
   * Evaluates if a failed task can be retried or if we should apply Partial Workflow Continuation.
   */
  async handleFailedTask(
    task: OrchestrationTask,
    error: string
  ): Promise<{ shouldRetry: boolean; updatedRetryCount: number }> {
    const maxRetries = 2;
    
    if (task.retryCount < maxRetries) {
      const nextAttempt = task.retryCount + 1;
      await this.timeline.logEvent('RECOVERY_TRIGGERED', {
        taskId: task.id,
        agentType: task.agentType,
        description: `Task failed: "${error}". Retrying execution (Attempt ${nextAttempt}/${maxRetries}).`,
        retryAttempt: nextAttempt
      });
      return { shouldRetry: true, updatedRetryCount: nextAttempt };
    }

    // Max retries reached - trigger Partial Workflow Continuation
    await this.timeline.logEvent('AGENT_FAILED', {
      taskId: task.id,
      agentType: task.agentType,
      description: `Agent ${task.agentType} failed to complete task after ${maxRetries} attempts. Triggering Partial Workflow Continuation.`,
      error
    });
    
    return { shouldRetry: false, updatedRetryCount: task.retryCount };
  }
}
