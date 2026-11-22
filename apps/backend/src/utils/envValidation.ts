/**
 * Startup Environment Variable Validation
 */
import { llmKeyMissing, resolveAgentModel, resolveVisionModel } from '@fricta/shared';

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
  try {
    resolveAgentModel();
    resolveVisionModel();
  } catch (err: any) {
    throw new Error(`CRITICAL_STARTUP_ERROR: ${err.message}`);
  }
}
