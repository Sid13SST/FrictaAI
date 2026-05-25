import { PrismaClient } from '@fricta/db';
import { RealtimeEventBus } from '@fricta/realtime';
import { CognitiveReasoningEngine } from '@fricta/cognitive-engine';
import { PersonaManager } from '../personas';
import { ConfidenceTracker } from '../confidence';
import { ShortTermMemory } from '../memory';
import { TimingEngine } from '../timing';
import { HesitationSimulator } from '../hesitation';
import { FrictionResponseEngine } from '../friction';
import { VisualDecisionEngine, VisualElement } from '../decisioning';
import { IntentEngine, UserIntent } from '../intent';
import { SimulationConfig } from '../types';

export class SimulationRunner {
  private memory = new ShortTermMemory();

  constructor(private prisma: PrismaClient) {}

  /**
   * Runs an autonomous behavior simulation based on profile configuration.
   */
  public async run(config: SimulationConfig): Promise<any> {
    const { projectId, personaType, startUrl, goal } = config;
    const traits = PersonaManager.getTraits(personaType);
    const confidenceTracker = new ConfidenceTracker(traits);

    // 1. Create a WorkflowSession representing this simulation run
    const session = await this.prisma.workflowSession.create({
      data: {
        projectId,
        goal: `Simulated: ${goal}`,
        persona: `${personaType} (Synthetic)`,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    // 2. Create SimulationProfile record
    const profile = await this.prisma.simulationProfile.create({
      data: {
        projectId,
        name: `${personaType} Audit Profile`,
        personaType,
        description: `Autonomous exploration of ${startUrl} targeting goal: "${goal}"`,
        traits: traits as any,
      },
    });

    const isLogin = startUrl.toLowerCase().includes('login');
    const isPricing = startUrl.toLowerCase().includes('pricing') || startUrl.toLowerCase().includes('plan');
    const isCheckout = startUrl.toLowerCase().includes('checkout') || startUrl.toLowerCase().includes('cart');

    let mockElements: VisualElement[] = [];

    if (isLogin) {
      mockElements = [
        { selector: 'input[name="username"]', type: 'INPUT', text: 'Username Input', ctaProminence: 0.2, contrastStrength: 0.8, interactionDensity: 0.3 },
        { selector: 'input[name="password"]', type: 'INPUT', text: 'Password Input', ctaProminence: 0.2, contrastStrength: 0.8, interactionDensity: 0.3 },
        { selector: 'a.forgot-password', type: 'LINK', text: 'Reset Password', ctaProminence: 0.1, contrastStrength: 0.6, interactionDensity: 0.2 },
        { selector: 'button.login-btn', type: 'BUTTON', text: 'Log In', ctaProminence: 0.9, contrastStrength: 0.9, interactionDensity: 0.4 },
        { selector: 'div.security-badge', type: 'TEXT_BLOCK', text: 'Shield Info', ctaProminence: 0.3, contrastStrength: 0.4, interactionDensity: 0.1 },
      ];
    } else if (isPricing) {
      mockElements = [
        { selector: 'div.starter-card', type: 'TEXT_BLOCK', text: 'Starter Plan Card', ctaProminence: 0.4, contrastStrength: 0.7, interactionDensity: 0.5 },
        { selector: 'button.select-starter', type: 'BUTTON', text: 'Select Starter', ctaProminence: 0.7, contrastStrength: 0.8, interactionDensity: 0.4 },
        { selector: 'div.pro-card', type: 'TEXT_BLOCK', text: 'Pro Plan Card', ctaProminence: 0.6, contrastStrength: 0.9, interactionDensity: 0.6 },
        { selector: 'button.select-pro', type: 'BUTTON', text: 'Select Pro Plan', ctaProminence: 0.95, contrastStrength: 0.95, interactionDensity: 0.4 },
        { selector: 'a.compare-link', type: 'LINK', text: 'Compare Plans', ctaProminence: 0.2, contrastStrength: 0.6, interactionDensity: 0.2 },
      ];
    } else if (isCheckout) {
      mockElements = [
        { selector: 'input[name="email"]', type: 'INPUT', text: 'Email Input', ctaProminence: 0.2, contrastStrength: 0.8, interactionDensity: 0.3 },
        { selector: 'input[name="password"]', type: 'INPUT', text: 'Password Input', ctaProminence: 0.2, contrastStrength: 0.8, interactionDensity: 0.3 },
        { selector: 'a.help-link', type: 'LINK', text: 'Get Help', ctaProminence: 0.1, contrastStrength: 0.5, interactionDensity: 0.2 },
        { selector: 'button[type="submit"]', type: 'BUTTON', text: 'Submit Form', ctaProminence: 0.9, contrastStrength: 0.9, interactionDensity: 0.4 },
        { selector: 'div.sidebar-banner', type: 'TEXT_BLOCK', text: 'Ad Banner', ctaProminence: 0.7, contrastStrength: 0.4, interactionDensity: 0.8 },
      ];
    } else {
      mockElements = [
        { selector: 'div.hero-header', type: 'TEXT_BLOCK', text: 'Hero Header Text', ctaProminence: 0.3, contrastStrength: 0.8, interactionDensity: 0.4 },
        { selector: 'button.get-started', type: 'BUTTON', text: 'Get Started CTA', ctaProminence: 0.95, contrastStrength: 0.95, interactionDensity: 0.3 },
        { selector: 'a.read-more', type: 'LINK', text: 'Learn More Link', ctaProminence: 0.2, contrastStrength: 0.6, interactionDensity: 0.2 },
        { selector: 'input.newsletter-email', type: 'INPUT', text: 'Newsletter Input', ctaProminence: 0.4, contrastStrength: 0.7, interactionDensity: 0.4 },
        { selector: 'button.subscribe', type: 'BUTTON', text: 'Subscribe Button', ctaProminence: 0.8, contrastStrength: 0.8, interactionDensity: 0.4 },
      ];
    }

    let currentIntent: UserIntent = 'BROWSE_NAVIGATION';
    let failuresCount = 0;
    const stepsLog: any[] = [];
    let isSuccess = false;
    let totalFriction = 0.0;

    // Simulate 5 interactive steps
    for (let stepIndex = 0; stepIndex < 5; stepIndex++) {
      // a. Rank visual elements based on layout properties and active traits
      const ranked = VisualDecisionEngine.rankElements(mockElements, traits, confidenceTracker.getConfidence());
      const bestChoice = ranked[0];

      // b. Update intent state
      currentIntent = IntentEngine.transition(currentIntent, traits, confidenceTracker.getConfidence(), failuresCount, {
        hasFormOnPage: true,
        hasHelpLink: true,
      });

      // c. Check for abandonment
      if (currentIntent === 'SYSTEM_ABANDONMENT') {
        totalFriction += 0.8;
        await this.prisma.frictionReaction.create({
          data: {
            workflowSessionId: session.id,
            stepIndex,
            reactionType: 'ABANDONMENT_RISK',
            triggerSource: 'Low Confidence & Persistence Failure',
            intensity: 0.9,
            description: 'Simulation abandoned early due to high cognitive friction.',
          },
        });
        break;
      }

      // d. Hesitation Check
      const hesitation = HesitationSimulator.simulate(traits, confidenceTracker.getConfidence(), {
        elementClutter: bestChoice.element.interactionDensity,
        isForm: bestChoice.element.type === 'INPUT',
      });

      if (hesitation) {
        totalFriction += hesitation.severity === 'HIGH' ? 0.3 : 0.1;
        
        let richDescription = hesitation.description;
        if (hesitation.signalType === 'FORM_FIELD_UNCERTAINTY') {
          richDescription = `User hesitated while filling out the "${bestChoice.element.text}" field (${bestChoice.element.selector}), double-checking the input format instructions.`;
        } else if (hesitation.signalType === 'CURSOR_DRIFT') {
          richDescription = `Cursor drifted aimlessly over the "${bestChoice.element.text}" element. User got distracted or started skimming the layout prior to committing to an action.`;
        } else if (hesitation.signalType === 'REPEATED_SCANNING') {
          richDescription = `Dense screen layout near "${bestChoice.element.text}" caused repeated visual scanning loops to search for the correct button or input box.`;
        } else if (hesitation.signalType === 'HOVER_HESITATION') {
          richDescription = `User hovered over the "${bestChoice.element.text}" button/link with uncertainty, hesitating for ${hesitation.durationMs}ms before committing to click it.`;
        }

        await this.prisma.hesitationSignal.create({
          data: {
            workflowSessionId: session.id,
            stepIndex,
            signalType: hesitation.signalType,
            targetElement: hesitation.targetElement || bestChoice.element.selector,
            durationMs: hesitation.durationMs,
            severity: hesitation.severity,
            description: richDescription,
          },
        });
      }

      // Invoke the Cognitive Decision Modeling Engine
      const cognitiveEngine = new CognitiveReasoningEngine(this.prisma);
      await cognitiveEngine.processStep({
        workflowSessionId: session.id,
        stepIndex,
        traits,
        elements: mockElements as any,
        activeElement: bestChoice.element as any,
        failuresCount,
        currentConfidence: confidenceTracker.getConfidence(),
        url: startUrl,
        hasHesitated: hesitation !== null,
        hesitationType: hesitation?.signalType,
      });

      // e. Timing & Latency
      const latency = TimingEngine.calculateDelay(
        bestChoice.element.type === 'INPUT' ? 'INPUT' : 'CLICK',
        traits,
        { elementClutter: bestChoice.element.interactionDensity, textLength: 15 }
      );

      // f. Update Confidence
      const isCorrectClick = bestChoice.element.type === 'BUTTON' || bestChoice.element.type === 'INPUT';
      if (isCorrectClick) {
        confidenceTracker.adjustAfterSuccess();
        failuresCount = 0;
      } else {
        confidenceTracker.adjustAfterFailure('MEDIUM');
        failuresCount++;
      }

      await this.prisma.navigationConfidenceEvent.create({
        data: {
          workflowSessionId: session.id,
          stepIndex,
          confidenceValue: confidenceTracker.getConfidence(),
          contextualDetails: `Step ${stepIndex} complete. Intent: ${currentIntent}. Element: ${bestChoice.element.text}`,
        },
      });

      // g. Save decision
      await this.prisma.behavioralDecision.create({
        data: {
          simulationProfileId: profile.id,
          workflowSessionId: session.id,
          stepIndex,
          actionType: bestChoice.element.type === 'INPUT' ? 'INPUT' : 'CLICK',
          targetElement: bestChoice.element.selector,
          decisionReason: bestChoice.reason,
          confidenceBefore: confidenceTracker.getConfidence(),
          confidenceAfter: confidenceTracker.getConfidence(),
          latencyMs: latency,
        },
      });

      // h. Emit Replay events
      const coords = { x: 100 + stepIndex * 80 + Math.random() * 20, y: 150 + Math.random() * 50 };
      const replayEvent = await this.prisma.behavioralReplayEvent.create({
        data: {
          simulationProfileId: profile.id,
          workflowSessionId: session.id,
          stepIndex,
          eventType: bestChoice.element.type === 'INPUT' ? 'INPUT' : 'CLICK',
          coordinates: coords,
          targetSelector: bestChoice.element.selector,
          durationMs: latency,
        },
      });

      stepsLog.push({
        stepIndex,
        url: startUrl,
        action: bestChoice.element.type === 'INPUT' ? 'INPUT' : 'CLICK',
        duration: latency,
      });

      // i. Broadcast live simulation update
      RealtimeEventBus.getInstance().publish({
        orchestrationSessionId: session.id,
        eventType: 'replay.updated', // streams directly to the dashboard player
        payload: {
          stepIndex,
          timestamp: new Date().toISOString(),
          action: {
            type: bestChoice.element.type === 'INPUT' ? 'INPUT' : 'CLICK',
            target: bestChoice.element.selector,
            value: null,
            status: 'completed',
          },
          thoughts: [bestChoice.reason],
          findings: [],
          confidence: confidenceTracker.getConfidence(),
          intent: currentIntent,
          coordinates: coords,
        },
      });

      if (bestChoice.element.type === 'BUTTON') {
        isSuccess = true;
      }
    }

    // 3. Save Final Exploration Path
    const path = await this.prisma.explorationPath.create({
      data: {
        simulationProfileId: profile.id,
        workflowSessionId: session.id,
        steps: stepsLog as any,
        isSuccess,
        totalFrictionScore: totalFriction,
      },
    });

    // Update session status
    await this.prisma.workflowSession.update({
      where: { id: session.id },
      data: {
        status: isSuccess ? 'COMPLETED' : 'FAILED',
        endedAt: new Date(),
      },
    });

    return {
      sessionId: session.id,
      profileId: profile.id,
      pathId: path.id,
      success: isSuccess,
    };
  }
}
