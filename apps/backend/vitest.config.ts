import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'json-summary'],
      include: [
        'src/middleware/clerkAuth.ts',
        'src/middleware/authContext.ts',
        'src/guards/ownership.ts',
      ],
      exclude: ['src/tests/**', 'src/index.ts'],
      thresholds: {
        statements: 75,
        branches: 75,
        functions: 75,
        lines: 75,
        'src/middleware/**': {
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
        },
        'src/guards/**': {
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90,
        },
        'src/routes/**': {
          statements: 80,
          branches: 70,
          functions: 80,
          lines: 80,
        },
      },
    },
  },
});
