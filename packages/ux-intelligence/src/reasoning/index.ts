import { SessionActivityData, PersonaProfileData, UXFindingData } from '../types';
import { BehavioralSignal } from '../behavior';

export const SEED_PERSONAS: PersonaProfileData[] = [
  {
    name: 'Beginner Teacher',
    description: 'A classroom educator with low-to-medium comfort with complex UI layouts, requiring strong guidance cues and clear descriptive context.',
    traits: {
      guidanceDependency: 'high',
      patience: 'high',
      comfortWithIA: 'low'
    },
    behaviorModifiers: {
      idleHesitationThresholdMs: 12000, // Hesitates easily
      maxActionCyclesAllowed: 2,
      excessiveStepsThreshold: 8
    }
  },
  {
    name: 'Power User',
    description: 'A tech-savvy power administrator focused on speed and efficiency. Expects fast progression paths, shortcuts, and lacks patience for redundant steps.',
    traits: {
      guidanceDependency: 'low',
      patience: 'low',
      comfortWithIA: 'high'
    },
    behaviorModifiers: {
      idleHesitationThresholdMs: 25000, // Ignores small delays, knows their way
      maxActionCyclesAllowed: 1, // Frustrated by even 1 loop
      excessiveStepsThreshold: 5 // Expects extremely short paths
    }
  },
  {
    name: 'First-Time User',
    description: 'A new user exploring the application for the first time. Lacks structural familiarity with the mental model of the product and is highly sensitive to poor onboarding paths.',
    traits: {
      guidanceDependency: 'high',
      patience: 'medium',
      comfortWithIA: 'medium'
    },
    behaviorModifiers: {
      idleHesitationThresholdMs: 15000,
      maxActionCyclesAllowed: 2,
      excessiveStepsThreshold: 7
    }
  }
];

export class PersonaEngine {
  /**
   * Projects behavioral and cognitive telemetry through the lens of specific personas to generate persona-based findings.
   */
  static run(
    session: SessionActivityData,
    behavioralSignals: BehavioralSignal[],
    personas: PersonaProfileData[] = SEED_PERSONAS
  ): UXFindingData[] {
    const findings: UXFindingData[] = [];
    const sessionId = session.id;

    const hesitations = behavioralSignals.filter(s => s.type === 'HESITATION');
    const loops = behavioralSignals.filter(s => s.type === 'NAVIGATION_LOOP');
    const retries = behavioralSignals.filter(s => s.type === 'INTERACTION_RETRY');
    const stepsCount = session.actions.length;

    for (const persona of personas) {
      const name = persona.name;
      const mods = persona.behaviorModifiers;

      // 1. Evaluate Beginner Teacher (Guidance and IA focus)
      if (name === 'Beginner Teacher') {
        // High guidance dependency: Any hesitation is likely due to lack of tooltips/help text.
        if (hesitations.length > 0) {
          findings.push({
            workflowSessionId: sessionId,
            findingType: 'ONBOARDING_FRICTION',
            severity: hesitations.length > 2 ? 'HIGH' : 'MEDIUM',
            personaType: 'BEGINNER',
            title: 'Inadequate Inline Guidance (Beginner Teacher)',
            description: `The user paused or hesitated ${hesitations.length} times. For a non-technical user, this hesitation signals confusion regarding next steps or complex terminology.`,
            evidence: `${hesitations.length} hesitation(s) detected. Example: ${hesitations[0]?.evidence || ''}`,
            recommendation: 'Provide explicit inline tooltips, instructional placeholding, or an onboarding helper to explain complex terminology.'
          });
        }

        // Form Usability for Beginner Teacher
        const hasFormInteraction = session.actions.some(a => 
          a.action === 'fill' || a.action === 'type' || a.target.toLowerCase().includes('input')
        );
        if (hasFormInteraction && retries.length > 0) {
          findings.push({
            workflowSessionId: sessionId,
            findingType: 'FORM_FRICTION',
            severity: 'HIGH',
            personaType: 'BEGINNER',
            title: 'Complex Form Interaction Friction',
            description: 'A Beginner Teacher encountered input friction, resulting in repeated form updates or retry events. This suggests validation rules or input expectations are unclear.',
            evidence: `Detected ${retries.length} input retry events in workflow actions.`,
            recommendation: 'Use live inline validation with helpful microcopy, rather than generic form submit validation errors.'
          });
        }
      }

      // 2. Evaluate Power User (Efficiency and Speed focus)
      if (name === 'Power User') {
        // Low patience: workflow steps > excessiveStepsThreshold or navigation loop triggers immediate friction
        if (stepsCount > mods.excessiveStepsThreshold) {
          findings.push({
            workflowSessionId: sessionId,
            findingType: 'COMPLEXITY',
            severity: stepsCount > 10 ? 'HIGH' : 'MEDIUM',
            personaType: 'POWER_USER',
            title: 'Excessive Workflow Step Overhead',
            description: `The workflow requires ${stepsCount} steps, exceeding the Power User limit of ${mods.excessiveStepsThreshold}. Power users expect streamlined micro-workflows or shortcut paths.`,
            evidence: `Session took ${stepsCount} steps to complete the goal.`,
            recommendation: 'Consolidate multiple confirmation pages, and provide a single-page quick action shortcut for expert paths.'
          });
        }

        if (loops.length > 0 || retries.length > 0) {
          findings.push({
            workflowSessionId: sessionId,
            findingType: 'COMPLEXITY',
            severity: 'MEDIUM',
            personaType: 'POWER_USER',
            title: 'Friction Loops Interrupting Expert Speed',
            description: 'Action retries or navigation loops occurred during execution. Power users expect high-efficiency layouts with no back-and-forth backtracking.',
            evidence: `Detected ${loops.length} loops and ${retries.length} interaction retries.`,
            recommendation: 'Streamline transition states and remove page reloads between sequential actions.'
          });
        }
      }

      // 3. Evaluate First-Time User (Mental Model and Navigation IA focus)
      if (name === 'First-Time User') {
        // Menu/Navigation Loop is highly damaging to First-Time User onboarding
        if (loops.length > 0) {
          findings.push({
            workflowSessionId: sessionId,
            findingType: 'IA_CONFUSION',
            severity: 'CRITICAL',
            personaType: 'FIRST_TIME_USER',
            title: 'Information Architecture Cycling Confusion',
            description: 'A first-time explorer fell into a navigation loop, cycling repeatedly between page sections. This shows the navigation menu hierarchy does not match their mental model.',
            evidence: `${loops.length} navigation loops. Path: ${JSON.stringify(loops[0]?.metadata?.path || '')}`,
            recommendation: 'Consolidate sidebar menu items, rename routes to plain-English action names, and highlight a linear progression pathway.'
          });
        }

        // Onboarding empty state / CTA discovery
        const hasWeakCTA = session.screenshots.some(s => 
          s.metadata?.findings?.some((f: any) => f.findingType?.includes('cta') || f.findingType?.includes('prominence'))
        );
        if (hasWeakCTA || hesitations.length > 1) {
          findings.push({
            workflowSessionId: sessionId,
            findingType: 'CTA_AMBIGUITY',
            severity: 'HIGH',
            personaType: 'FIRST_TIME_USER',
            title: 'Primary Progression Ambiguity',
            description: 'A first-time user struggled to locate the primary call to action (CTA) due to competing visual weights or hidden links on the dashboard.',
            evidence: 'First-time user idle/hesitation detected near interactive sections.',
            recommendation: 'Establish visual hierarchy. Ensure only one primary CTA button is highlighted in a distinct accent color per screen context.'
          });
        }
      }
    }

    return findings;
  }
}
