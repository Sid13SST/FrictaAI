import { RealtimeEventBus } from '@fricta/realtime';
import { PersonaTraits, VisualElement } from '../types';
import { CognitiveLoadEstimator } from '../load';
import { ConfidenceSignalEstimator } from '../confidence';
import { ExpectationMismatchEstimator } from '../expectation';
import { AttentionHierarchyEstimator } from '../attention';
import { DecisionComplexityEstimator } from '../decisioning';
import { UsabilityTrustEstimator } from '../trust';
import { AbandonmentRiskEstimator } from '../abandonment';

export class CognitiveReasoningEngine {
  private prisma: any;

  constructor(prismaInstance: any) {
    this.prisma = prismaInstance;
  }

  /**
   * Processes all cognitive modeling subsystems for a single exploration step,
   * writes the explainable database records, and streams live telemetry.
   */
  public async processStep(params: {
    workflowSessionId: string;
    stepIndex: number;
    traits: PersonaTraits;
    elements: VisualElement[];
    activeElement: VisualElement;
    failuresCount: number;
    currentConfidence: number;
    url: string;
    hasHesitated: boolean;
    hesitationType?: string;
  }): Promise<any> {
    const {
      workflowSessionId,
      stepIndex,
      traits,
      elements,
      activeElement,
      failuresCount,
      currentConfidence,
      url,
      hasHesitated,
      hesitationType,
    } = params;

    // 1. Run all individual cognitive engines
    const loadResult = CognitiveLoadEstimator.calculate(traits, elements, {
      stepIndex,
      isForm: activeElement.type === 'INPUT',
      activeElement,
      failuresCount,
    });

    const confidenceResult = ConfidenceSignalEstimator.calculate(traits, currentConfidence, {
      hasHesitated,
      hesitationType,
      failuresCount,
      actionType: activeElement.type === 'INPUT' ? 'INPUT' : 'CLICK',
      targetSelector: activeElement.selector,
    });

    const expectationResult = ExpectationMismatchEstimator.calculate(
      traits,
      activeElement,
      url,
      stepIndex
    );

    const attentionResult = AttentionHierarchyEstimator.calculate(
      traits,
      elements,
      activeElement
    );

    const decisionResult = DecisionComplexityEstimator.calculate(traits, elements);

    const trustResult = UsabilityTrustEstimator.calculate(traits, activeElement, failuresCount);

    const abandonmentResult = AbandonmentRiskEstimator.calculate(
      traits,
      loadResult.cognitiveLoad,
      confidenceResult.confidenceScore,
      failuresCount,
      stepIndex
    );

    // 2. Persist to Postgres database (run queries concurrently for speed)
    const [stateDb, signalDb, attentionDb, decisionDb, riskDb] = await Promise.all([
      this.prisma.cognitiveState.create({
        data: {
          workflowSessionId,
          stepIndex,
          cognitiveLoad: loadResult.cognitiveLoad,
          mentalEffort: loadResult.mentalEffort,
          informationLoad: loadResult.informationLoad,
          interactionLoad: loadResult.interactionLoad,
          description: loadResult.description,
        },
      }),
      this.prisma.confidenceSignal.create({
        data: {
          workflowSessionId,
          stepIndex,
          confidenceScore: confidenceResult.confidenceScore,
          certaintyLevel: confidenceResult.certaintyLevel,
          targetElement: activeElement.selector,
          evidenceSource: confidenceResult.evidenceSource,
          description: confidenceResult.description,
        },
      }),
      this.prisma.attentionEvent.create({
        data: {
          workflowSessionId,
          stepIndex,
          targetElement: activeElement.selector,
          visibilityWeight: attentionResult.visibilityWeight,
          focusHeat: attentionResult.focusHeat,
          overloadDetected: attentionResult.overloadDetected,
          description: attentionResult.description,
        },
      }),
      this.prisma.decisionComplexityEvent.create({
        data: {
          workflowSessionId,
          stepIndex,
          choiceCount: decisionResult.choiceCount,
          ambiguityScore: decisionResult.ambiguityScore,
          complexityLevel: decisionResult.complexityLevel,
          nextActionClarity: decisionResult.nextActionClarity,
          description: decisionResult.description,
        },
      }),
      this.prisma.abandonmentRiskSignal.create({
        data: {
          workflowSessionId,
          stepIndex,
          riskProbability: abandonmentResult.riskProbability,
          triggerSource: abandonmentResult.triggerSource,
          frictionAccumulated: abandonmentResult.frictionAccumulated,
          description: abandonmentResult.description,
        },
      }),
    ]);

    // Handle expectation mismatch write if present
    let expectationDb = null;
    if (expectationResult) {
      expectationDb = await this.prisma.expectationMismatch.create({
        data: {
          workflowSessionId,
          stepIndex,
          expectedAction: expectationResult.expectedAction,
          actualAction: expectationResult.actualAction,
          mismatchSeverity: expectationResult.mismatchSeverity,
          mismatchCategory: expectationResult.mismatchCategory,
          description: expectationResult.description,
        },
      });
    }

    // 3. Process Cognitive Timeline Events (Spikes, Falls, Mismatches)
    const timelineEventsData = [];

    if (loadResult.cognitiveLoad > 0.65) {
      timelineEventsData.push({
        workflowSessionId,
        stepIndex,
        eventType: 'COGNITIVE_LOAD_SPIKE',
        intensity: loadResult.cognitiveLoad,
        associatedId: stateDb.id,
        description: `Mental effort spiked to ${(loadResult.cognitiveLoad * 100).toFixed(0)}% due to layout interaction complexity.`,
      });
    }

    if (expectationResult && expectationDb) {
      timelineEventsData.push({
        workflowSessionId,
        stepIndex,
        eventType: 'EXPECTATION_FAIL',
        intensity: expectationResult.mismatchSeverity === 'HIGH' ? 0.8 : 0.5,
        associatedId: expectationDb.id,
        description: `Mental schema mismatch on "${activeElement.text}": ${expectationResult.description}`,
      });
    }

    if (confidenceResult.confidenceScore < 0.35) {
      timelineEventsData.push({
        workflowSessionId,
        stepIndex,
        eventType: 'CONFIDENCE_DROP',
        intensity: 1.0 - confidenceResult.confidenceScore,
        associatedId: signalDb.id,
        description: `Navigation confidence collapsed to ${(confidenceResult.confidenceScore * 100).toFixed(0)}% from evidence: ${confidenceResult.evidenceSource}.`,
      });
    }

    if (attentionResult.overloadDetected) {
      timelineEventsData.push({
        workflowSessionId,
        stepIndex,
        eventType: 'ATTENTION_SHIFT',
        intensity: attentionResult.focusHeat,
        associatedId: attentionDb.id,
        description: 'Focus competition detected. User attention is split by high visual overload.',
      });
    }

    if (abandonmentResult.riskProbability > 0.5) {
      timelineEventsData.push({
        workflowSessionId,
        stepIndex,
        eventType: 'RISK_ESCALATION',
        intensity: abandonmentResult.riskProbability,
        associatedId: riskDb.id,
        description: `Abandonment risk escalated to ${(abandonmentResult.riskProbability * 100).toFixed(0)}% triggered by ${abandonmentResult.triggerSource}.`,
      });
    }

    for (const tEvent of timelineEventsData) {
      await this.prisma.cognitiveTimelineEvent.create({
        data: tEvent,
      });
    }

    // 4. Publish unified SSE updates to the Realtime event bus
    RealtimeEventBus.getInstance().publish({
      orchestrationSessionId: workflowSessionId,
      eventType: 'cognition.updated',
      payload: {
        stepIndex,
        timestamp: new Date().toISOString(),
        cognitiveLoad: loadResult.cognitiveLoad,
        mentalEffort: loadResult.mentalEffort,
        confidenceScore: confidenceResult.confidenceScore,
        certaintyLevel: confidenceResult.certaintyLevel,
        visibilityWeight: attentionResult.visibilityWeight,
        focusHeat: attentionResult.focusHeat,
        choiceCount: decisionResult.choiceCount,
        riskProbability: abandonmentResult.riskProbability,
        triggerSource: abandonmentResult.triggerSource,
        expectationMismatch: expectationResult ? {
          category: expectationResult.mismatchCategory,
          severity: expectationResult.mismatchSeverity,
          description: expectationResult.description,
        } : null,
      },
    });

    return {
      load: loadResult,
      confidence: confidenceResult,
      expectation: expectationResult,
      attention: attentionResult,
      decision: decisionResult,
      trust: trustResult,
      abandonment: abandonmentResult,
    };
  }
}
