import { defineConfig } from 'vitest/config';

// %90+ coverage eşiği (docs/08_TESTING_STRATEGY.md §2,
// .claude/rules/04-quality-gates.md) İterasyon 4 ile birlikte zorlanıyor.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'prisma/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/index.ts',
        // Tekil PrismaClient bootstrap'ı — dallanma/iş kuralı içermez,
        // gerçek davranışı yalnızca gerçek bir DB bağlantısıyla (integration
        // katmanı) anlamlı şekilde test edilebilir.
        'src/prisma/client.ts',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
