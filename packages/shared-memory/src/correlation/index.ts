import { PrismaClient } from '@fricta/db';
import { SharedMemoryStorage } from '../storage';
import { CorrelatedFindingInput } from '../types';

export class SharedMemoryCorrelationEngine {
  private storage: SharedMemoryStorage;

  constructor(
    private prisma: PrismaClient,
    private orchestrationSessionId: string
  ) {
    this.storage = new SharedMemoryStorage(prisma, orchestrationSessionId);
  }

  /**
   * Evaluates rule-based correlations across all agent outputs for the current session.
   * Persists correlated finding clusters to the database.
   */
  async runCorrelation(): Promise<CorrelatedFindingInput[]> {
    const sessionId = this.orchestrationSessionId;

    // Fetch findings and signals for the current orchestration session
    const executions = await this.prisma.agentExecution.findMany({
      where: { orchestrationSessionId: sessionId },
      include: {
        findings: true,
        signals: true
      }
    });

    const findings = executions.flatMap(exec => exec.findings);
    const signals = executions.flatMap(exec => exec.signals);

    const correlations: CorrelatedFindingInput[] = [];

    // Helper: Find signal of type
    const findSignal = (type: string) => signals.find(s => s.signalType.toUpperCase().includes(type.toUpperCase()));
    
    // Helper: Find findings of type/agent
    const findFindingsByAgent = (agent: string) => findings.filter(f => f.agentType === agent);

    // Rule 1: Navigation Loop + Discoverability Weak CTA
    const navLoopSig = findSignal('LOOP') || findSignal('NAVIGATION');
    const discoverabilitySig = findSignal('CTA') || findSignal('DISCOVERABILITY');
    if (navLoopSig && discoverabilitySig && navLoopSig.intensity > 0.4 && discoverabilitySig.intensity > 0.4) {
      const navFindings = findFindingsByAgent('NAVIGATION_AGENT');
      const ctaFindings = findFindingsByAgent('DISCOVERABILITY_AGENT');
      if (navFindings.length > 0 || ctaFindings.length > 0) {
        correlations.push({
          findingIds: [...navFindings.map(f => f.id), ...ctaFindings.map(f => f.id)],
          correlationType: 'NAV_LOOP_CTA_DISCOVERABILITY',
          summary: 'Navigation confusion loop is directly correlated with poor action discoverability. Users are repeatedly switching routes because the primary Call-To-Action lacks visual prominence.',
          confidence: Math.min(0.95, (navLoopSig.intensity + discoverabilitySig.intensity) / 2 + 0.2),
          metadata: {
            navIntensity: navLoopSig.intensity,
            discoverabilityIntensity: discoverabilitySig.intensity
          }
        });
      }
    }

    // Rule 2: Visual Clutter + Cognitive Overload
    const visualClutterSig = findSignal('CLUTTER') || findSignal('VISUAL');
    const cognitiveOverloadSig = findSignal('FATIGUE') || findSignal('COGNITIVE') || findSignal('OVERLOAD');
    if (visualClutterSig && cognitiveOverloadSig && visualClutterSig.intensity > 0.4 && cognitiveOverloadSig.intensity > 0.4) {
      const visualFindings = findFindingsByAgent('VISUAL_AGENT');
      const cognitiveFindings = findFindingsByAgent('COGNITIVE_AGENT');
      if (visualFindings.length > 0 || cognitiveFindings.length > 0) {
        correlations.push({
          findingIds: [...visualFindings.map(f => f.id), ...cognitiveFindings.map(f => f.id)],
          correlationType: 'VISUAL_CLUTTER_COGNITIVE_FATIGUE',
          summary: 'Excessive visual clutter and layout density are compounding user decision fatigue. The complexity of the UI structure is increasing the cognitive effort needed to process form fields.',
          confidence: Math.min(0.92, (visualClutterSig.intensity + cognitiveOverloadSig.intensity) / 2 + 0.15),
          metadata: {
            visualClutterIntensity: visualClutterSig.intensity,
            cognitiveIntensity: cognitiveOverloadSig.intensity
          }
        });
      }
    }

    // Rule 3: Onboarding Delay + Discoverability CTA Prominence
    const onboardingHesitationSig = findSignal('HESITATION') || findSignal('ONBOARDING');
    if (onboardingHesitationSig && discoverabilitySig && onboardingHesitationSig.intensity > 0.4 && discoverabilitySig.intensity > 0.4) {
      const onboardingFindings = findFindingsByAgent('ONBOARDING_AGENT');
      const ctaFindings = findFindingsByAgent('DISCOVERABILITY_AGENT');
      if (onboardingFindings.length > 0 || ctaFindings.length > 0) {
        correlations.push({
          findingIds: [...onboardingFindings.map(f => f.id), ...ctaFindings.map(f => f.id)],
          correlationType: 'ONBOARDING_HESITATION_CTA_PROMINENCE',
          summary: 'First-step onboarding delay matches poor interactive affordance indicators. User hesitation during setup is due to critical progress triggers being visually obscured or hard to locate.',
          confidence: Math.min(0.89, (onboardingHesitationSig.intensity + discoverabilitySig.intensity) / 2 + 0.15),
          metadata: {
            onboardingIntensity: onboardingHesitationSig.intensity,
            discoverabilityIntensity: discoverabilitySig.intensity
          }
        });
      }
    }

    // Rule 4: Workflow Bottleneck + Navigation Loop
    const workflowBottleneckSig = findSignal('BOTTLENECK') || findSignal('WORKFLOW');
    if (workflowBottleneckSig && navLoopSig && workflowBottleneckSig.intensity > 0.4 && navLoopSig.intensity > 0.4) {
      const workflowFindings = findFindingsByAgent('WORKFLOW_AGENT');
      const navFindings = findFindingsByAgent('NAVIGATION_AGENT');
      if (workflowFindings.length > 0 || navFindings.length > 0) {
        correlations.push({
          findingIds: [...workflowFindings.map(f => f.id), ...navFindings.map(f => f.id)],
          correlationType: 'WORKFLOW_BOTTLENECK_NAV_LOOP',
          summary: 'A critical workflow transition bottleneck is being driven by route dead-ends or loop switches. Process progression delays are heavily influenced by navigation failures.',
          confidence: Math.min(0.94, (workflowBottleneckSig.intensity + navLoopSig.intensity) / 2 + 0.2),
          metadata: {
            workflowIntensity: workflowBottleneckSig.intensity,
            navIntensity: navLoopSig.intensity
          }
        });
      }
    }

    if (correlations.length > 0) {
      await this.storage.saveCorrelatedFindings(correlations);
    }

    return correlations;
  }
}
