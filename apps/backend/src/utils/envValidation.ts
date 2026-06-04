/**
 * Startup Environment Variable Validation
 */
export function validateEnv(): void {
  const required = [
    'DATABASE_URL',
    'REDIS_URL',
    'CLERK_SECRET_KEY',
    'CLERK_PUBLISHABLE_KEY',
    'OPENROUTER_API_KEY',
  ];

  const missing: string[] = [];

  for (const envVar of required) {
    if (!process.env[envVar] || process.env[envVar].trim() === '') {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `CRITICAL_STARTUP_ERROR: Missing required environment variables: ${missing.join(', ')}`
    );
  }
}
