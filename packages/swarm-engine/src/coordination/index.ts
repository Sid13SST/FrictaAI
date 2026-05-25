import { PrismaClient } from '@fricta/db';
import { RealtimeEventBus } from '@fricta/realtime';
import { SwarmPersonaManager } from '../personas';
import { DivergenceEngine } from '../divergence';
import { SurvivabilityEngine } from '../survivability';
import { HeatmapEngine } from '../heatmaps';
import { AnalyticsEngine } from '../analytics';
import { SwarmConfig, SwarmPersonaType } from '../types';

export class SwarmOrchestrator {
  constructor(private prisma: PrismaClient) {}

  public async execute(config: SwarmConfig): Promise<any> {
    const { projectId, startUrl, goal, personas } = config;

    // 1. Create Swarm Session
    const swarmSession = await this.prisma.swarmSession.create({
      data: {
        projectId,
        name: `Synthetic Swarm Audit — ${new Date().toLocaleDateString()}`,
        startUrl,
        goal,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    const executionsData: any[] = [];
    const isLogin = startUrl.toLowerCase().includes('login');
    const isPricing = startUrl.toLowerCase().includes('pricing') || startUrl.toLowerCase().includes('plan');
    const isCheckout = startUrl.toLowerCase().includes('checkout') || startUrl.toLowerCase().includes('cart');

    let mockElements: any[] = [];
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
        { selector: 'input[name="email"]', type: 'INPUT', text: 'Email Address', ctaProminence: 0.2, contrastStrength: 0.8, interactionDensity: 0.3 },
        { selector: 'input[name="password"]', type: 'INPUT', text: 'Password Field', ctaProminence: 0.2, contrastStrength: 0.8, interactionDensity: 0.3 },
        { selector: 'a.help-link', type: 'LINK', text: 'Get Help', ctaProminence: 0.1, contrastStrength: 0.5, interactionDensity: 0.2 },
        { selector: 'button[type="submit"]', type: 'BUTTON', text: 'Confirm Billing', ctaProminence: 0.9, contrastStrength: 0.9, interactionDensity: 0.4 },
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

    // 2. Concurrently run each persona simulation in isolated pipelines
    for (const personaType of personas) {
      const traits = SwarmPersonaManager.getTraits(personaType);
      const displayName = SwarmPersonaManager.getDisplayName(personaType);

      // Create isolated WorkflowSession
      const workflowSession = await this.prisma.workflowSession.create({
        data: {
          projectId,
          goal: `Swarm: ${goal}`,
          persona: `${displayName} (Swarm Participant)`,
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });

      const simulationProfile = await this.prisma.simulationProfile.create({
        data: {
          projectId,
          name: `${displayName} Swarm Profile`,
          personaType: personaType.startsWith('POWER') ? 'POWER_USER' : personaType.startsWith('BEGINNER') ? 'BEGINNER' : personaType.startsWith('DISTRACTED') ? 'DISTRACTED_USER' : 'FIRST_TIME_USER',
          description: `Swarm run for ${displayName}`,
          traits: traits as any,
        },
      });

      const personaExecution = await this.prisma.personaExecution.create({
        data: {
          swarmSessionId: swarmSession.id,
          personaType: displayName,
          workflowSessionId: workflowSession.id,
          status: 'RUNNING',
          completionRate: 0.0,
          durationMs: 0,
          frictionScore: 0.0,
          stepsCompleted: 0,
        },
      });

      let stepsCount = 0;
      let accumulatedFriction = 0.0;
      let sessionStatus = 'COMPLETED';
      const stepsLog: any[] = [];
      const replaysLog: any[] = [];

      let currentConfidence = traits.navigationConfidence;

      // Simulate 5 interactive steps for this persona
      for (let stepIndex = 0; stepIndex < 5; stepIndex++) {
        // Abandonment check
        if (currentConfidence < traits.abandonmentThreshold) {
          sessionStatus = 'FAILED';
          accumulatedFriction += 0.9;
          await this.prisma.abandonmentRiskSignal.create({
            data: {
              workflowSessionId: workflowSession.id,
              stepIndex,
              riskProbability: 0.95,
              triggerSource: 'CONFIDENCE_DEGRADATION',
              frictionAccumulated: accumulatedFriction,
              description: `User abandoned the onboarding flow at step ${stepIndex + 1} due to low confidence and high cognitive load.`,
            },
          });
          break;
        }

        // Hesitation simulation
        const hasHesitated = Math.random() > traits.attentionStability;
        let hesitationDuration = 0;
        if (hasHesitated) {
          hesitationDuration = Math.round(1500 + Math.random() * 2000);
          accumulatedFriction += 0.2;
          await this.prisma.hesitationSignal.create({
            data: {
              workflowSessionId: workflowSession.id,
              stepIndex,
              signalType: 'HOVER_HESITATION',
              targetElement: mockElements[stepIndex % mockElements.length].selector,
              durationMs: hesitationDuration,
              severity: traits.navigationConfidence < 0.5 ? 'HIGH' : 'MEDIUM',
              description: `User hovered with uncertainty over the "${mockElements[stepIndex % mockElements.length].text}" element before clicking.`,
            },
          });
        }

        // Expectation mismatch check
        const isMismatch = Math.random() > traits.ctaTrustLevel;
        if (isMismatch) {
          accumulatedFriction += 0.15;
          await this.prisma.expectationMismatch.create({
            data: {
              workflowSessionId: workflowSession.id,
              stepIndex,
              expectedAction: 'Prominent, clear CTA button',
              actualAction: mockElements[stepIndex % mockElements.length].selector,
              mismatchSeverity: 'MEDIUM',
              mismatchCategory: 'CTA_AMBIGUITY',
              description: `Layout conventions break: User expected a clearer CTA, but had to scan multiple secondary options.`,
            },
          });
        }

        // Create CognitiveState
        const cognitiveLoad = Math.min(1.0, Math.max(0.0, 0.4 + (1.0 - traits.cognitiveTolerance) * 0.4 + (hasHesitated ? 0.2 : 0)));
        const mentalEffort = Math.min(1.0, Math.max(0.0, 0.3 + (1.0 - traits.navigationConfidence) * 0.4 + stepIndex * 0.05));
        await this.prisma.cognitiveState.create({
          data: {
            workflowSessionId: workflowSession.id,
            stepIndex,
            cognitiveLoad,
            mentalEffort,
            informationLoad: cognitiveLoad * 0.9,
            interactionLoad: mentalEffort * 0.8,
            description: `Swarm step telemetry snapshot for ${displayName}.`,
          },
        });

        // Create AttentionEvent
        const focusHeat = Math.min(1.0, Math.max(0.0, traits.attentionStability * 0.9 + (hasHesitated ? -0.2 : 0.1)));
        await this.prisma.attentionEvent.create({
          data: {
            workflowSessionId: workflowSession.id,
            stepIndex,
            targetElement: mockElements[stepIndex % mockElements.length].selector,
            visibilityWeight: mockElements[stepIndex % mockElements.length].ctaProminence,
            focusHeat,
            overloadDetected: cognitiveLoad > 0.7,
            description: `Visual attention centered on ${mockElements[stepIndex % mockElements.length].text}`,
          },
        });

        // Create DecisionComplexityEvent
        await this.prisma.decisionComplexityEvent.create({
          data: {
            workflowSessionId: workflowSession.id,
            stepIndex,
            choiceCount: mockElements.length,
            ambiguityScore: 1.0 - mockElements[stepIndex % mockElements.length].ctaProminence,
            complexityLevel: mockElements.length > 4 ? 'HIGH' : 'MEDIUM',
            nextActionClarity: currentConfidence,
            description: `Ambiguity mapping complete.`,
          },
        });

        // Pacing & Delay
        const latency = Math.round(800 + (1.0 - traits.formConfidence) * 1200 + hesitationDuration);

        // Adjust confidence
        const isSuccessStep = Math.random() > 0.2;
        if (isSuccessStep) {
          currentConfidence = Math.min(1.0, currentConfidence + 0.1);
        } else {
          currentConfidence = Math.max(0.0, currentConfidence - 0.15);
        }

        await this.prisma.navigationConfidenceEvent.create({
          data: {
            workflowSessionId: workflowSession.id,
            stepIndex,
            confidenceValue: currentConfidence,
            contextualDetails: `Step complete. Current confidence is ${(currentConfidence * 100).toFixed(0)}%.`,
          },
        });

        // Add SwarmReplayEvent
        const coords = { x: 100 + stepIndex * 80 + Math.random() * 20, y: 150 + Math.random() * 50 };
        const stepEvent = await this.prisma.swarmReplayEvent.create({
          data: {
            personaExecutionId: personaExecution.id,
            stepIndex,
            timestampMs: stepIndex * 2000 + latency,
            eventType: mockElements[stepIndex % mockElements.length].type,
            targetSelector: mockElements[stepIndex % mockElements.length].selector,
            coordinates: coords,
            cognitiveLoad,
            confidence: currentConfidence,
            description: `Performed ${mockElements[stepIndex % mockElements.length].type} on ${mockElements[stepIndex % mockElements.length].text}`,
          },
        });

        replaysLog.push(stepEvent);
        stepsCount++;

        stepsLog.push({
          stepIndex,
          url: startUrl,
          action: mockElements[stepIndex % mockElements.length].type,
          duration: latency,
        });

        // Emit SSE event to live console
        RealtimeEventBus.getInstance().publish({
          orchestrationSessionId: swarmSession.id,
          eventType: 'swarm.step',
          payload: {
            swarmSessionId: swarmSession.id,
            personaType: displayName,
            stepIndex,
            eventType: mockElements[stepIndex % mockElements.length].type,
            selector: mockElements[stepIndex % mockElements.length].selector,
            coordinates: coords,
            cognitiveLoad,
            confidence: currentConfidence,
          },
        });

        // Artificial yield delay for streaming feel
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // Update WorkflowSession
      await this.prisma.workflowSession.update({
        where: { id: workflowSession.id },
        data: {
          status: sessionStatus,
          endedAt: new Date(),
        },
      });

      // Save ExplorationPath
      await this.prisma.explorationPath.create({
        data: {
          simulationProfileId: simulationProfile.id,
          workflowSessionId: workflowSession.id,
          steps: stepsLog as any,
          isSuccess: sessionStatus === 'COMPLETED',
          totalFrictionScore: accumulatedFriction,
        },
      });

      // Update PersonaExecution
      const updatedExec = await this.prisma.personaExecution.update({
        where: { id: personaExecution.id },
        data: {
          status: sessionStatus,
          completionRate: sessionStatus === 'COMPLETED' ? 1.0 : 0.0,
          durationMs: stepsCount * 2000,
          frictionScore: accumulatedFriction,
          stepsCompleted: stepsCount,
        },
      });

      executionsData.push({
        ...updatedExec,
        replays: replaysLog,
      });
    }

    // 3. Compute Path Divergences
    const rawExecutions = executionsData.map((e) => ({
      personaType: e.personaType,
      steps: e.replays,
    }));
    const divergenceEvents = DivergenceEngine.detect(swarmSession.id, rawExecutions);
    for (const div of divergenceEvents) {
      await this.prisma.divergenceEvent.create({ data: div });
    }

    // 4. Compute Survivability Metrics
    const survivability = SurvivabilityEngine.calculate(executionsData);
    await this.prisma.workflowSurvivabilityMetric.create({
      data: {
        swarmSessionId: swarmSession.id,
        workflowPath: startUrl,
        overallCompletionRate: survivability.overallCompletionRate,
        averageSteps: survivability.averageSteps,
        failureClusterCount: survivability.failureClusterCount,
        abandonmentRiskAverage: survivability.abandonmentRiskAverage,
        failurePoints: survivability.failurePoints as any,
      },
    });

    // 5. Compute Population Heatmaps
    const heatmaps = HeatmapEngine.calculate(startUrl, executionsData);
    for (const heat of heatmaps) {
      await this.prisma.populationHeatmap.create({
        data: {
          swarmSessionId: swarmSession.id,
          pageUrl: heat.pageUrl,
          selector: heat.selector,
          clickCount: heat.clickCount,
          hoverCount: heat.hoverCount,
          averageHesitationMs: heat.averageHesitationMs,
          averageFrictionScore: heat.averageFrictionScore,
          attentionWeight: heat.attentionWeight,
          cognitiveDensity: heat.cognitiveDensity,
        },
      });
    }

    // 6. Compute Persona Comparisons & Analytics
    const analytics = AnalyticsEngine.calculate(executionsData);
    const presets = SwarmPersonaManager.getAllPresets();
    const activePersonaNames = personas.map((p) => SwarmPersonaManager.getDisplayName(p));

    for (let i = 0; i < activePersonaNames.length; i++) {
      for (let j = i + 1; j < activePersonaNames.length; j++) {
        const personaA = activePersonaNames[i];
        const personaB = activePersonaNames[j];
        const frictionA = analytics.frictionDistribution[personaA] || 0;
        const frictionB = analytics.frictionDistribution[personaB] || 0;

        await this.prisma.personaComparison.create({
          data: {
            swarmSessionId: swarmSession.id,
            personaA,
            personaB,
            similarityScore: Math.max(0.1, 1.0 - Math.abs(frictionA - frictionB)),
            divergenceNotes: `Comparative analysis shows ${personaA} experienced ${frictionA.toFixed(2)} friction compared to ${personaB} experiencing ${frictionB.toFixed(2)} friction.`,
            pathVariance: Math.abs(
              (executionsData.find((e) => e.personaType === personaA)?.stepsCompleted || 0) -
                (executionsData.find((e) => e.personaType === personaB)?.stepsCompleted || 0)
            ),
            cognitiveDelta: Math.abs(frictionA - frictionB),
          },
        });
      }
    }

    // 7. Finalize Swarm Session Status
    const finalSwarmSession = await this.prisma.swarmSession.update({
      where: { id: swarmSession.id },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
      },
    });

    return {
      swarmSessionId: finalSwarmSession.id,
      status: 'COMPLETED',
      overallCompletionRate: survivability.overallCompletionRate,
      stabilityScore: analytics.workflowStabilityScore,
    };
  }
}
