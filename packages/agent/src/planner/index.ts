/**
 * AI Decision Engine (Planner)
 *
 * The AI Decision Engine receives MCP context + goal + history,
 * calls the AI provider, and returns a validated AgentDecision.
 *
 * Architecture:
 *   MCP Context + Goal + History
 *        ↓
 *   AI Provider (OpenRouter)
 *        ↓
 *   Raw Response (string)
 *        ↓
 *   parseAndValidate (validator)
 *        ↓
 *   AgentDecision
 */

import { MCPContext } from '@fricta/types';
import { AIProvider } from '../providers';
import { buildSystemPrompt } from '../prompts/system';
import { buildContextPrompt } from '../prompts/context';
import { parseAndValidate } from '../validators/action';
import { AgentDecision, ExecutedAction, PersonaType } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlannerResult {
  decision: AgentDecision;
  rawResponse: string;
  retried: boolean;
  tokenUsage?: { prompt: number; completion: number; total: number };
}

// ─── Planner ──────────────────────────────────────────────────────────────────

export class AgentPlanner {
  private readonly provider: AIProvider;
  private systemPrompt: string | null = null;

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  /**
   * plan
   *
   * Given the current MCP context, goal, persona, and recent action history,
   * returns the next validated AgentDecision.
   *
   * Retries once with an error correction message if the first attempt fails validation.
   */
  async plan(
    goal: string,
    persona: PersonaType,
    context: MCPContext,
    actionHistory: ExecutedAction[],
    variables?: Record<string, string>
  ): Promise<PlannerResult> {
    // Rebuild system prompt to include fresh variables
    const systemPrompt = buildSystemPrompt(persona, variables);

    const contextPrompt = buildContextPrompt(goal, context, actionHistory);

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: contextPrompt },
    ];

    // ── First Attempt ───────────────────────────────────────────────────────

    const response = await this.provider.chat(messages);
    const firstAttempt = parseAndValidate(response.content, actionHistory);

    if (firstAttempt.valid && firstAttempt.sanitized) {
      return {
        decision: {
          thought: firstAttempt.thought ?? '',
          action: firstAttempt.sanitized.action,
          target: firstAttempt.sanitized.target,
          value: firstAttempt.sanitized.value,
        },
        rawResponse: response.content,
        retried: false,
        tokenUsage: response.usage
          ? {
              prompt: response.usage.promptTokens,
              completion: response.usage.completionTokens,
              total: response.usage.totalTokens,
            }
          : undefined,
      };
    }

    // ── Retry with Error Correction ──────────────────────────────────────────

    console.warn('[Planner] First attempt failed validation, retrying with correction:', firstAttempt.error);

    const correctionMessages = [
      ...messages,
      { role: 'assistant' as const, content: response.content },
      {
        role: 'user' as const,
        content: `Your previous response was invalid: ${firstAttempt.error}\n\nPlease respond again with ONLY a valid JSON object in this exact format:\n{"thought":"...","action":"...","target":"...","value":"..."}\n\nDo not include any other text.`,
      },
    ];

    const retryResponse = await this.provider.chat(correctionMessages);
    const retryAttempt = parseAndValidate(retryResponse.content, actionHistory);

    if (retryAttempt.valid && retryAttempt.sanitized) {
      return {
        decision: {
          thought: retryAttempt.thought ?? '',
          action: retryAttempt.sanitized.action,
          target: retryAttempt.sanitized.target,
          value: retryAttempt.sanitized.value,
        },
        rawResponse: retryResponse.content,
        retried: true,
        tokenUsage: retryResponse.usage
          ? {
              prompt: retryResponse.usage.promptTokens,
              completion: retryResponse.usage.completionTokens,
              total: retryResponse.usage.totalTokens,
            }
          : undefined,
      };
    }

    // Both attempts failed — throw with combined diagnostic
    throw new Error(
      `[Planner] Failed to get valid action after retry.\n` +
      `Attempt 1 error: ${firstAttempt.error}\n` +
      `Attempt 2 error: ${retryAttempt.error}\n` +
      `Raw response: ${retryResponse.content.slice(0, 200)}`
    );
  }

  /**
   * resetSystemPrompt
   *
   * Call this if the persona changes mid-session (not typical, but supported).
   */
  resetSystemPrompt(): void {
    this.systemPrompt = null;
  }
}
