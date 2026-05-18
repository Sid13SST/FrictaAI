/**
 * Autonomous Agent Loop
 *
 * The core orchestrator of the Fricta autonomous workflow agent.
 * Implements the Observe → Analyze → Decide → Execute → Evaluate loop.
 *
 * Key properties:
 * - Deterministic: same inputs produce predictable behavior
 * - Inspectable: every thought and action is logged and emitted
 * - Debuggable: all safeguards produce clear diagnostic messages
 * - Modular: each concern (planning, execution, memory) is isolated
 */

import { Page } from 'playwright-core';
import { MCPContextBuilder, InteractionTracker, MemoryEngine, ScreenshotService } from '@fricta/mcp';
import { MCPContext } from '@fricta/types';
import { AIProvider } from '../providers';
import { AgentPlanner } from '../planner';
import { Executor } from '../executor';
import { AgentMemory } from '../memory/agent-memory';
import {
  AgentLoopState,
  AgentLoopEvents,
  ExecutedAction,
  PersonaType,
  PERSONA_PRESETS,
  LoopConfig,
  DEFAULT_LOOP_CONFIG,
} from '../types';

// ─── Agent Loop ───────────────────────────────────────────────────────────────

export class AgentLoop {
  private readonly planner: AgentPlanner;
  private readonly contextBuilder: MCPContextBuilder;
  private readonly interactionTracker: InteractionTracker;
  private readonly mcpMemory: MemoryEngine;
  private readonly screenshot: ScreenshotService;
  private readonly agentMemory: AgentMemory;
  private readonly config: LoopConfig;

  constructor(
    private readonly provider: AIProvider,
    config?: Partial<LoopConfig>
  ) {
    this.planner = new AgentPlanner(provider);
    this.contextBuilder = new MCPContextBuilder();
    this.interactionTracker = new InteractionTracker();
    this.mcpMemory = new MemoryEngine();
    this.screenshot = new ScreenshotService();
    this.agentMemory = new AgentMemory();
    this.config = { ...DEFAULT_LOOP_CONFIG, ...config };
  }

  /**
   * run
   *
   * Executes the autonomous workflow loop for a given goal, persona, and page.
   * Emits events for observability (thoughts, actions, steps).
   * Returns the final loop state.
   */
  async run(
    sessionId: string,
    goal: string,
    persona: PersonaType,
    page: Page,
    events: AgentLoopEvents = {},
    variables?: Record<string, string>
  ): Promise<AgentLoopState> {
    const personaConfig =
      PERSONA_PRESETS[persona] ?? {
        name: persona,
        description: persona,
        explorationBias: 0.4,
        hesitationBias: 0.2,
        directnessBias: 0.6,
      };

    const state: AgentLoopState = {
      sessionId,
      goal,
      persona: personaConfig,
      currentStep: 0,
      consecutiveFailures: 0,
      startedAt: new Date(),
      recentActions: [],
      status: 'running',
    };

    const executor = new Executor(page);
    const totalTimeoutDeadline = Date.now() + this.config.totalTimeoutMs;

    // Record initial URL
    this.agentMemory.recordUrl(page.url());
    this.mcpMemory.recordVisit(page.url());

    console.log(`[AgentLoop] Starting — goal: "${goal}" | persona: "${persona}" | model: ${this.provider.getModel()}`);

    // ── Main Loop ───────────────────────────────────────────────────────────

    while (state.currentStep < this.config.maxSteps) {

      // ── Timeout Protection ──────────────────────────────────────────────
      if (Date.now() > totalTimeoutDeadline) {
        console.warn('[AgentLoop] Total timeout reached');
        state.status = 'timeout';
        break;
      }

      state.currentStep++;
      const stepStart = Date.now();
      console.log(`[AgentLoop] Step ${state.currentStep}/${this.config.maxSteps}`);

      try {
        // Per-step timeout wrapper
        const stepResult = await Promise.race([
          this.runStep(sessionId, goal, persona, page, executor, state, variables),
          new Promise<'timeout'>((resolve) =>
            setTimeout(() => resolve('timeout'), this.config.stepTimeoutMs)
          ),
        ]);

        if (stepResult === 'timeout') {
          console.warn(`[AgentLoop] Step ${state.currentStep} timed out`);
          state.consecutiveFailures++;
          if (state.consecutiveFailures >= this.config.maxRetries) {
            console.error('[AgentLoop] Max consecutive failures reached');
            state.status = 'failed';
            break;
          }
          continue;
        }

        const { executed, isTerminal } = stepResult;

        // ── Emit Events ───────────────────────────────────────────────────
        if (events.onThought) {
          await Promise.resolve(events.onThought(executed.thought, state.currentStep));
        }
        if (events.onAction) {
          await Promise.resolve(events.onAction(executed));
        }
        if (events.onStep) {
          await Promise.resolve(events.onStep(state.currentStep, state));
        }

        // ── Update State ──────────────────────────────────────────────────
        state.recentActions.push(executed);
        // Keep sliding window
        if (state.recentActions.length > this.config.loopDetectionWindow * 2) {
          state.recentActions = state.recentActions.slice(-this.config.loopDetectionWindow * 2);
        }

        // Track URL in agent memory
        const currentUrl = executor.getCurrentUrl();
        this.agentMemory.recordUrl(currentUrl);
        this.mcpMemory.recordVisit(currentUrl);

        // ── Failure Tracking ──────────────────────────────────────────────
        if (executed.status === 'failed' || executed.status === 'invalid') {
          state.consecutiveFailures++;
          this.agentMemory.recordFailure(executed.target);

          if (state.consecutiveFailures >= this.config.maxRetries) {
            console.error(`[AgentLoop] Max consecutive failures (${this.config.maxRetries}) reached`);
            state.status = 'failed';
            break;
          }
        } else {
          state.consecutiveFailures = 0;
        }

        // ── Dead-End Detection ────────────────────────────────────────────
        if (this.agentMemory.deadEnd) {
          console.warn(`[AgentLoop] Dead-end detected — stagnant on URL for ${this.agentMemory.stagnationCount} steps`);
          state.status = 'loop_detected';
          break;
        }

        // ── Terminal Signal ───────────────────────────────────────────────
        if (isTerminal) {
          const isComplete = executed.target === 'goal_complete';
          console.log(`[AgentLoop] Terminal signal: ${executed.target}`);
          state.status = isComplete ? 'completed' : 'loop_detected';
          break;
        }

        const stepDuration = Date.now() - stepStart;
        console.log(`[AgentLoop] Step ${state.currentStep} completed in ${stepDuration}ms — action: ${executed.action} → ${executed.status}`);

      } catch (err: any) {
        console.error(`[AgentLoop] Step ${state.currentStep} error:`, err.message);
        state.consecutiveFailures++;

        if (state.consecutiveFailures >= this.config.maxRetries) {
          state.status = 'failed';
          if (events.onError) {
            await Promise.resolve(events.onError(err, state));
          }
          break;
        }
      }
    }

    // ── Final Status ─────────────────────────────────────────────────────────
    if (state.status === 'running') {
      state.status = 'completed'; // hit max steps = consider completed
    }

    if (events.onComplete) {
      await Promise.resolve(events.onComplete(state));
    }

    console.log(`[AgentLoop] Finished — status: ${state.status} | steps: ${state.currentStep}`);
    return state;
  }

  // ── Step Execution ──────────────────────────────────────────────────────────

  private async runStep(
    sessionId: string,
    goal: string,
    persona: PersonaType,
    page: Page,
    executor: Executor,
    state: AgentLoopState,
    variables?: Record<string, string>
  ): Promise<{ executed: ExecutedAction; isTerminal: boolean }> {

    // 1. OBSERVE: Build MCP context from current page state
    const observeStart = Date.now();
    const context: MCPContext = await this.contextBuilder.build(
      sessionId,
      page,
      this.interactionTracker,
      this.mcpMemory
    );
    console.log(`[AgentLoop:Timer] OBSERVE phase took ${Date.now() - observeStart}ms`);

    // 2. ANALYZE + DECIDE: AI planner produces next action
    const analyzeStart = Date.now();
    const planResult = await this.planner.plan(
      goal,
      persona,
      context,
      state.recentActions,
      variables
    );
    console.log(`[AgentLoop:Timer] ANALYZE phase took ${Date.now() - analyzeStart}ms`);

    const { decision } = planResult;

    // Check for terminal states before executing
    const isTerminal =
      decision.action === 'wait' &&
      (decision.target === 'goal_complete' || decision.target === 'dead_end');

    // 3. EXECUTE: Send validated action to executor → Playwright
    const executeStart = Date.now();
    const execResult = await executor.execute({
      action: decision.action,
      target: decision.target,
      value: decision.value,
    });
    console.log(`[AgentLoop:Timer] EXECUTE phase took ${Date.now() - executeStart}ms`);

    // Record interaction in MCP tracker
    this.interactionTracker.record({
      type: decision.action,
      target: decision.target,
      url: page.url(),
      metadata: { step: state.currentStep, thought: decision.thought },
    });


    // Capture screenshot after action — fire-and-forget (never blocks step timeout)
    if (!page.isClosed()) {
      this.screenshot.captureViewport(page, sessionId, `step-${state.currentStep}`)
        .catch((screenshotErr: any) => {
          // Silently ignore — page may have navigated or closed
          if (!screenshotErr.message?.includes('closed')) {
            console.warn('[AgentLoop] Screenshot failed (non-critical):', screenshotErr.message);
          }
        });
    }

    // 4. EVALUATE: Build executed action record
    const executed: ExecutedAction = {
      thought: decision.thought,
      action: decision.action,
      target: decision.target,
      value: decision.value,
      status: execResult.status,
      errorMessage: execResult.errorMessage,
      stepNumber: state.currentStep,
      timestamp: new Date(),
    };

    return { executed, isTerminal };
  }
}
