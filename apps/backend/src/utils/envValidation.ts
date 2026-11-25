/**
 * Startup Environment Variable Validation
 */
import { llmKeyMissing, resolveAgentModel, resolveVisionModel, resolveLLMEndpoint } from '@fricta/shared';

export function validateEnv(): void {
  const required = [
    'DATABASE_URL',
    'REDIS_URL',
    'CLERK_SECRET_KEY',
    'CLERK_PUBLISHABLE_KEY',
  ];

  const missing: string[] = [];

  for (const envVar of required) {
    if (!process.env[envVar] || process.env[envVar].trim() === '') {
      missing.push(envVar);
    }
  }

  // OpenRouter needs a key; a custom AGENT_BASE_URL (e.g. a local
  // OpenAI-compatible server) may not.
  if (llmKeyMissing()) {
    missing.push('OPENROUTER_API_KEY (or AGENT_BASE_URL + optional AGENT_API_KEY)');
  }

  if (missing.length > 0) {
    throw new Error(
      `CRITICAL_STARTUP_ERROR: Missing required environment variables: ${missing.join(', ')}`
    );
  }

  // Fail loudly at boot if a paid model is configured without ALLOW_PAID_MODELS=true.
  let agentModel: string;
  let visionModel: string;
  try {
    agentModel = resolveAgentModel();
    visionModel = resolveVisionModel();
  } catch (err: any) {
    throw new Error(`CRITICAL_STARTUP_ERROR: ${err.message}`);
  }

  const endpoint = resolveLLMEndpoint();
  console.log(`[LLM] agent model: ${agentModel} | vision model: ${visionModel} | endpoint: ${endpoint.baseUrl}`);
  if (endpoint.isOpenRouter) {
    // Free variants are rotated by OpenRouter; the id can stop resolving
    // (404 "No endpoints found") without any change here.
    console.log('[LLM] Free model availability can change. Re-check with `npm run check:models --workspace=@fricta/backend` (public models API, no key).');
  }
}
