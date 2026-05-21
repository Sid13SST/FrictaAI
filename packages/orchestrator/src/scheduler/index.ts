import { OrchestrationTask } from '../types';

export class TaskScheduler {
  private queue: OrchestrationTask[] = [];

  /**
   * Register a new task in the scheduler queue.
   */
  addTask(task: OrchestrationTask) {
    this.queue.push(task);
  }

  /**
   * Retrieve all tasks currently managed by the scheduler.
   */
  getQueue(): OrchestrationTask[] {
    return this.queue;
  }

  /**
   * Identifies all tasks that are currently executable based on their state and dependencies.
   */
  getNextExecutableTasks(): OrchestrationTask[] {
    const completedTaskIds = new Set(
      this.queue.filter(t => t.status === 'COMPLETED').map(t => t.id)
    );

    return this.queue.filter(t => 
      (t.status === 'PENDING' || t.status === 'QUEUED') &&
      t.dependencies.every(depId => completedTaskIds.has(depId))
    );
  }
}
