import { logger } from '@fricta/shared';

export interface TimelineMilestone {
  sessionId: string;
  versionIndex: number;
  goal: string;
  status: string;
  duration: number;
  stepCount: number;
  findingsCount: number;
  regressionCount: number;
  improvementCount: number;
  createdAt: string;
}

export class WorkflowTimelineBuilder {
  /**
   * Builds a sequential timeline of workflow sessions.
   */
  static build(sessions: any[], regressions: any[]): TimelineMilestone[] {
    logger.info({ sessionCount: sessions.length }, 'WorkflowTimelineBuilder building milestones');
    const milestones: TimelineMilestone[] = [];

    // Sort sessions in chronological order
    const sorted = [...sessions].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];
      const sessionRegressions = regressions.filter(r => r.evidenceSessionId === s.id);
      
      // Calculate improvements: e.g., if steps decreased or duration decreased compared to previous run
      let improvements = 0;
      if (i > 0) {
        const prev = sorted[i - 1];
        const currSteps = s.stepCount || 0;
        const prevSteps = prev.stepCount || 0;
        if (currSteps < prevSteps && prevSteps > 0) {
          improvements++;
        }
        
        const currDuration = s.metrics?.duration || 0;
        const prevDuration = prev.metrics?.duration || 0;
        if (currDuration < prevDuration && prevDuration > 0) {
          improvements++;
        }
      }

      milestones.push({
        sessionId: s.id,
        versionIndex: i + 1,
        goal: s.goal || 'General Usability Diagnostics',
        status: s.status,
        duration: s.metrics?.duration || 0,
        stepCount: s.stepCount || 0,
        findingsCount: s.uxFindings?.length || 0,
        regressionCount: sessionRegressions.length,
        improvementCount: improvements,
        createdAt: s.createdAt
      });
    }

    return milestones;
  }
}
