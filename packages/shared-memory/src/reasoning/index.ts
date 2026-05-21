import { PrismaClient } from '@fricta/db';

export interface CooperativeRecommendation {
  id: string;
  title: string;
  summary: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  collaboratingAgents: string[];
  remediationSteps: string[];
  impactScore: number; // 0 to 1
}

export class SharedMemoryReasoningEngine {
  constructor(
    private prisma: PrismaClient,
    private orchestrationSessionId: string
  ) {}

  /**
   * Compiles cooperative recommendations by mapping current session insights,
   * correlations, and findings into actionable development tasks.
   */
  async compileRecommendations(): Promise<CooperativeRecommendation[]> {
    const sessionId = this.orchestrationSessionId;

    // Fetch correlations and insights to generate recommendations
    const correlations = await this.prisma.correlatedFinding.findMany({
      where: { orchestrationSessionId: sessionId }
    });

    const insights = await this.prisma.collaborativeInsight.findMany({
      where: { orchestrationSessionId: sessionId }
    });

    const recommendations: CooperativeRecommendation[] = [];

    // Map correlations into recommendations
    for (const corr of correlations) {
      if (corr.correlationType === 'NAV_LOOP_CTA_DISCOVERABILITY') {
        recommendations.push({
          id: `rec-nav-cta-${corr.id.substring(0, 8)}`,
          title: 'Promote Core Interactive CTAs & Relieve Navigation Loops',
          summary: 'Solve user navigation loops by upgrading CTA visual affordances on primary buttons. This prevents users from backtracking to find actions.',
          severity: 'HIGH',
          collaboratingAgents: ['NAVIGATION_AGENT', 'DISCOVERABILITY_AGENT'],
          remediationSteps: [
            'Increase font-weight and color contrast on primary workspace CTA buttons.',
            'Ensure the next workflow step is explicitly visible without scroll interaction.',
            'Remove duplicate navigation links that lead to the same dashboard layout state.'
          ],
          impactScore: 0.88
        });
      }

      if (corr.correlationType === 'VISUAL_CLUTTER_COGNITIVE_FATIGUE') {
        recommendations.push({
          id: `rec-visual-cog-${corr.id.substring(0, 8)}`,
          title: 'Streamline Layout Density and Simplify Cognitive Processing',
          summary: 'Reduce layout density in critical forms. Distribute heavy input structures across tabs or multi-step wizard views to minimize decision fatigue.',
          severity: 'HIGH',
          collaboratingAgents: ['VISUAL_AGENT', 'COGNITIVE_AGENT'],
          remediationSteps: [
            'Implement progressive disclosure for optional configurations.',
            'Add clear category headings and group related form controls together.',
            'Increase default row heights and vertical margins around text fields.'
          ],
          impactScore: 0.85
        });
      }

      if (corr.correlationType === 'ONBOARDING_HESITATION_CTA_PROMINENCE') {
        recommendations.push({
          id: `rec-onb-cta-${corr.id.substring(0, 8)}`,
          title: 'Clarify First-Time Setup Milestones',
          summary: 'Address user hesitation during setup onboarding. Provide step progress indicators and guide them visually to the main onboarding triggers.',
          severity: 'MEDIUM',
          collaboratingAgents: ['ONBOARDING_AGENT', 'DISCOVERABILITY_AGENT'],
          remediationSteps: [
            'Introduce a visual progress stepper (e.g. Step 1 of 3) on the onboarding modal.',
            'Add micro-animations or spotlight tooltips pointing to the "Start Setup" action.',
            'Reduce the initial input requirements down to only essential variables.'
          ],
          impactScore: 0.76
        });
      }

      if (corr.correlationType === 'WORKFLOW_BOTTLENECK_NAV_LOOP') {
        recommendations.push({
          id: `rec-work-nav-${corr.id.substring(0, 8)}`,
          title: 'Resolve Router Redundancies and Workflow Dead-Ends',
          summary: 'Eliminate workflow bottlenecks by removing navigational dead-ends. Ensure error flows have clear escape or back-out paths.',
          severity: 'CRITICAL',
          collaboratingAgents: ['WORKFLOW_AGENT', 'NAVIGATION_AGENT'],
          remediationSteps: [
            'Audit all HTTP error states to ensure a "Return to Dashboard" action is present.',
            'Enable autosave for partial inputs to prevent data loss on routing changes.',
            'Implement a back-button confirm warning dialog only when unsaved changes exist.'
          ],
          impactScore: 0.95
        });
      }
    }

    // Default recommendation if no correlations are present
    if (recommendations.length === 0) {
      // Map based on high-level insights
      const hasCritical = insights.some(i => i.severity === 'CRITICAL' || i.severity === 'HIGH');
      recommendations.push({
        id: 'rec-default-general',
        title: 'Optimize Platform Layout and Control Outlines',
        summary: 'Review basic button contrast, borders, and margins to improve user scanability across all key page layouts.',
        severity: hasCritical ? 'HIGH' : 'LOW',
        collaboratingAgents: ['COGNITIVE_AGENT', 'VISUAL_AGENT'],
        remediationSteps: [
          'Verify contrast ratio (minimum 4.5:1) for all interactive labels.',
          'Implement subtle hover feedback transitions on lists and menu items.'
        ],
        impactScore: 0.60
      });
    }

    return recommendations;
  }
}
