/**
 * AI Provider Factory
 *
 * Model-agnostic provider abstraction.
 * Reads config from environment variables.
 * Prepared for future multi-provider routing (Gemini, DeepSeek, etc.)
 */

import { OpenRouterProvider } from './openrouter';
import { AIMessage, AIProviderConfig, AIProviderResponse } from '../types';

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
 * Creates the appropriate AI provider based on environment configuration.
 * Currently defaults to OpenRouter (model-agnostic gateway).
 *
 * Environment variables:
 *   OPENROUTER_API_KEY  — Required for OpenRouter
 *   AGENT_MODEL         — Model string (e.g. "openai/gpt-4o-mini")
 *                         Defaults to "openai/gpt-4o-mini"
 */
export function createAIProvider(provider: ProviderName = 'openrouter'): AIProvider {
  const model = process.env.AGENT_MODEL ?? 'openai/gpt-4o-mini';
  const maxTokensEnv = process.env.AGENT_MAX_TOKENS ? parseInt(process.env.AGENT_MAX_TOKENS, 10) : undefined;
  const maxTokens = (maxTokensEnv && !isNaN(maxTokensEnv)) ? maxTokensEnv : 150;

  switch (provider) {
    case 'openrouter': {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error(
          '[AIProvider] OPENROUTER_API_KEY is not set. ' +
          'Add it to your .env file: OPENROUTER_API_KEY=sk-or-...'
        );
      }

      const config: AIProviderConfig = {
        apiKey,
        model,
        maxTokens,
        temperature: 0.3,
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
