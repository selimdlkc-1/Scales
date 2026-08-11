import { defineConfig } from 'vitest/config';

// %60+ coverage eşiği (docs/08_TESTING_STRATEGY.md §2, .claude/rules/04-quality-gates.md).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/index.ts',
        // CLI giriş noktaları: yalnızca job'u çağırıp süreç kodunu/log satırını
        // biçimlendirir, dallanma/iş kuralı içermez — asıl davranış jobs/*.test.ts
        // tarafından kapsanır (docs/04_BACKEND_SPEC.md §8).
        'src/entrypoints/**/*.ts',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
    },
  },
});
