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
    },
  },
});
