import { defineConfig } from 'vitest/config';

// %60+ coverage eşiği (docs/08_TESTING_STRATEGY.md §2, .claude/rules/04-quality-gates.md).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['app/**/*.test.ts', 'lib/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['app/**/*.ts', 'lib/**/*.ts'],
      exclude: ['app/**/*.test.ts', 'lib/**/*.test.ts', 'app/**/*.tsx'],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
    },
  },
});
