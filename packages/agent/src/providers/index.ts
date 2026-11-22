/**
 * AI Provider Factory
 *
 * Model-agnostic provider abstraction.
 * Reads config from environment variables.
 * Prepared for future multi-provider routing (Gemini, DeepSeek, etc.)
 */

import { OpenRouterProvider } from './openrouter';
import { AIMessage, AIProviderConfig, AIProviderResponse } from '../types';
import { resolveAgentModel, resolveLLMEndpoint } from '@fricta/shared';

// ─── Provider Interface ───────────────────────────────────────────────────────

export interface AIProvider {
  chat(messages: AIMessage[]): Promise<AIProviderResponse>;
  getModel(): string;
}

// ─── Supported Providers ──────────────────────────────────────────────────────

export type ProviderName = 'openrouter';

// Future providers will be registered here:
// | 'gemini' | 'openai' | 'deepseek'

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * createAIProvider
 *
 * Creates the AI provider from environment configuration. The provider speaks
 * the OpenAI chat-completions protocol, so it works against OpenRouter (the
 * default) or any OpenAI-compatible endpoint given by AGENT_BASE_URL.
 *
 * Environment variables:
 *   AGENT_BASE_URL      — Optional. OpenAI-compatible base URL (".../v1").
 *                         Defaults to https://openrouter.ai/api/v1
 *   AGENT_API_KEY       — Optional key for AGENT_BASE_URL; falls back to
 *                         OPENROUTER_API_KEY. Required only for OpenRouter.
 *   AGENT_MODEL         — Model id. Defaults to a free model
 *                         (DEFAULT_FREE_AGENT_MODEL). Non-free ids throw
 *                         PaidModelNotAllowedError unless ALLOW_PAID_MODELS=true.
 *   AGENT_MAX_TOKENS    — Completion token cap (default 150).
 */
export function createAIProvider(provider: ProviderName = 'openrouter'): AIProvider {
  // Throws loudly for paid models unless explicitly allowed.
  const model = resolveAgentModel();
  const maxTokensEnv = process.env.AGENT_MAX_TOKENS ? parseInt(process.env.AGENT_MAX_TOKENS, 10) : undefined;
  const maxTokens = (maxTokensEnv && !isNaN(maxTokensEnv)) ? maxTokensEnv : 150;

  switch (provider) {
    case 'openrouter': {
      const endpoint = resolveLLMEndpoint();
      if (endpoint.isOpenRouter && !endpoint.apiKey) {
        throw new Error(
          '[AIProvider] OPENROUTER_API_KEY is not set. ' +
          'Add it to your .env file (OPENROUTER_API_KEY=sk-or-...), ' +
          'or point AGENT_BASE_URL at another OpenAI-compatible endpoint.'
        );
      }

      const config: AIProviderConfig = {
        apiKey: endpoint.apiKey,
        model,
        maxTokens,
        temperature: 0.3,
        baseUrl: endpoint.baseUrl,
      };

      return new OpenRouterProvider(config);
    }

    // Future: 'gemini', 'openai', 'deepseek' — same interface
    default:
      throw new Error(`[AIProvider] Unknown provider: "${provider}". Supported: openrouter`);
  }
}

// ─── Re-exports ───────────────────────────────────────────────────────────────

export { OpenRouterProvider } from './openrouter';
