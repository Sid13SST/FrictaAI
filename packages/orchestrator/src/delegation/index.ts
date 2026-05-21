import { randomUUID } from 'crypto';
import { OrchestrationTask, AgentType } from '../types';

export class DelegationEngine {
  /**
   * Generates a new structured task with dependency and priority parameters.
   */
  createTask(
    agentType: AgentType,
    description: string,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    dependencies: string[] = []
  ): OrchestrationTask {
    const id = randomUUID();
    return {
      id,
      agentType,
      description,
      priority,
      dependencies,
      status: 'PENDING',
      retryCount: 0
    };
  }

  /**
   * Routes tasks deterministically based on workflow session parameters.
   */
  routeInvestigation(sessionGoal: string): OrchestrationTask[] {
    console.log(`[DelegationEngine] Synthesizing collaborative pipeline for goal: "${sessionGoal}"`);
    
    // 1. Audit visual/layout presentation
    const visualTask = this.createTask(
      'VISUAL_AUDITOR',
      'Audit layout grids, overlapping buttons, and element discoverability in page screenshots.',
      'HIGH'
    );

    // 2. Perform cognitive and journey friction analysis (needs visual findings context)
    const cognitiveTask = this.createTask(
      'COGNITIVE_SIMULATOR',
      'Simulate cognitive pathways, onboarding blocks, and user behavior hesitation timings.',
      'CRITICAL',
      [visualTask.id]
    );

    // 3. Compile executive grades and report summaries
    const reportTask = this.createTask(
      'UX_ORCHESTRATOR',
      'Synthesize report metrics, calculate consolidated scorecards, and update data stores.',
      'MEDIUM',
      [cognitiveTask.id]
    );

    return [visualTask, cognitiveTask, reportTask];
  }
}
