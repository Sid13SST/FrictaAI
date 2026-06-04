import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    include: ['src/tests/integration/**/*.test.ts'],
    env: {
      DATABASE_URL: 'postgresql://fricta:fricta_dev@localhost:5432/fricta_test?schema=public',
      CLERK_SECRET_KEY: 'sk_test_dummy_clerk_secret_key_for_tests',
      CLERK_PUBLISHABLE_KEY: 'pk_test_dummy_clerk_publishable_key_for_tests',
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    reporters: ['default', 'junit', 'json'],
    outputFile: {
      junit: 'test-results/integration-junit.xml',
      json: 'test-results/integration-results.json',
    },
  },
});
